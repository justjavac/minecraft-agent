#!/usr/bin/env node
import { main } from "./main.js";

void main(process.argv).then((exitCode) => {
  process.exitCode = exitCode;
});
