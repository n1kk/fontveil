import { patchFont } from "obfuscai";

patchFont({
  family: "Fragment Mono",
  key: "obfuscai-default-seed",
  name: "Obfuscated",
  mappingOptions: {
    seqLength: 1,
    charset: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(""),
    scrambleAlphabet: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  },
}).then(() => {
  document.querySelector("article")?.classList.add("ready");
});
