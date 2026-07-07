# Building a Real-Time Event Pipeline with Node.js

_June 4, 2026 ~ 12 min read_

Last month our team hit a wall. Our batch processing pipeline, which had served us well for three years, could no longer keep up with the volume of events flowing through our system. We were processing around 50,000 events per second during peak hours, and the 15-minute batch window meant users were seeing stale data in their dashboards.

The decision to move to real-time processing was not taken lightly. We evaluated Kafka, Pulsar, and a handful of managed services before landing on a surprisingly simple architecture built on Node.js streams and a few well-chosen libraries.

## Why Not Just Use Kafka?

I know what you are thinking. Kafka is the industry standard for event streaming. And you would be right for most cases. But our constraints were specific:

- Our team of four had zero Kafka operational experience
- Our event payloads were small (under 2KB each)
- We needed sub-second latency, not just high throughput
- Our infrastructure budget was already stretched thin

> The best architecture is the one your team can actually operate at 2 AM when something breaks.

## The Architecture

At its core, the pipeline is three stages: ingest, transform, and sink. Each stage is a Node.js Transform stream, connected with backpressure handling built in. Here is the simplified version:

```typescript
const pipeline = new EventPipeline({
  source: new RedisStreamSource({
    host: process.env.REDIS_HOST,
    streams: ["events:clicks", "events:views"],
    group: "pipeline-v2",
    batchSize: 100,
  }),
  transforms: [
    new DeduplicateTransform({ windowMs: 30_000 }),
    new EnrichTransform({ geoDb: "./data/geo.mmdb" }),
    new AggregateTransform({ windowMs: 1_000 }),
  ],
  sink: new PostgresSink({
    table: "events_processed",
    batchSize: 500,
    flushIntervalMs: 1_000,
  }),
});

await pipeline.start();
```

The Redis Streams consumer group handles distribution across multiple workers. Each worker runs the full transform chain in-process, which keeps latency low by avoiding network hops between stages.

## Handling Backpressure

The trickiest part was getting backpressure right. When Postgres slows down (and it will), we need the entire pipeline to slow down gracefully rather than buffering events in memory until the process crashes.

Node.js streams handle this natively through the highWaterMark mechanism, but we added a circuit breaker on top:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure > this.resetMs) {
        this.state = "half-open";
      } else {
        throw new CircuitOpenError();
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }
}
```

### Monitoring the Pipeline

We expose Prometheus metrics from each stage: events received, events emitted, processing latency percentiles, and backpressure stalls. The key metric turned out to be the ratio between ingest rate and sink rate. When that ratio exceeds 1.2 for more than 30 seconds, we know we are heading for trouble.

## Results After Three Months

The numbers speak for themselves:

- End-to-end latency dropped from 15 minutes to 800ms (p99)
- Memory usage is stable at around 200MB per worker
- We handle 60,000 events per second across 3 workers
- Zero data loss incidents since launch
- Operational overhead is minimal since it is just Node.js processes

The biggest surprise was how much simpler debugging became. When something goes wrong, we are looking at JavaScript stack traces and console.log output, not deciphering JVM garbage collection logs or Kafka consumer group rebalancing issues.

## What I Would Do Differently

If I were starting over, I would invest more time upfront in schema validation at the ingest boundary. We spent two painful weeks tracking down a bug caused by a malformed timestamp field that only appeared in events from one specific mobile client version. A strict schema check at the entry point would have caught it immediately.

I would also consider using SQLite as a local write-ahead log instead of relying entirely on Redis for durability. The Redis Streams acknowledgment model is good, but having a local buffer would make the system more resilient to Redis outages.

---

If you are building something similar or have questions about the approach, feel free to reach out. The Node.js streaming primitives are more powerful than most people give them credit for.
