import { patchFont } from "fontveil";

patchFont({
  family: "Fragment Mono",
  key: "fontveil-default-seed",
  name: "Obfuscated",
  mappingOptions: {
    seqLength: 1,
    charset:
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(
        "",
      ),
    scrambleAlphabet:
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  },
}).then(() => {
  document.querySelector("article")?.classList.add("ready");
});
