import { patchFont } from "obfuscai";

patchFont({
  family: "Montserrat",
  key: "obfuscai-default-seed",
  name: "Obfuscated",
  mappingOptions: { variants: 3, exclude: [" ", "\n", "\t"] },
}).then(() => {
  document.querySelector("article")?.classList.add("ready");
});
