import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { stripIndents } from "common-tags";
import * as JSONRepairJS from "json-repair-js";
import langs from "langs";
import invariant from "tiny-invariant";

interface Translator {
  translate(text: string): Promise<string>;
  [Symbol.dispose](): void;
}

interface Params {
  sourceLanguage: string;
  targetLanguage: string;
}

export async function createTranslator(params: Params): Promise<Translator> {
  const sourceLang = langs.where("1", params.sourceLanguage);
  invariant(sourceLang, `Unsupported source language code: ${params.sourceLanguage}`);

  const targetLang = langs.where("1", params.targetLanguage);
  invariant(targetLang, `Unsupported target language code: ${params.targetLanguage}`);

  let engine: any;
  try {
    engine = await CreateMLCEngine("gemma-2-2b-jpn-it-q4f16_1-MLC");
  } catch (err) {
    console.error("CreateMLCEngine failed:", err);
    throw err;
  }

  return {
    async translate(text: string): Promise<string> {
      let reply: any;
      try {
        reply = await engine.chat.completions.create({
          messages: [
            {
              role: "system",
              content: stripIndents`
              You are a professional translator. Translate the following text from ${sourceLang.name} to ${targetLang.name}.
              Provide as JSON only in the format: { "result": "{{translated text}}" } without any additional explanations.
            `,
            },
            {
              role: "user",
              content: text,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0,
        });
      } catch (err) {
        console.error("translation engine request failed:", err);
        throw err;
      }

      if (!reply || !Array.isArray(reply.choices) || reply.choices.length === 0) {
        console.error("translation reply missing choices:", reply);
        throw new Error("Invalid reply from translation engine");
      }

      const content = reply.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        console.error("translation reply content is empty or not a string:", reply);
        throw new Error("No content in the reply from the translation engine.");
      }

      let parsed: any = null;
      try {
        parsed = JSONRepairJS.loads(content);
      } catch (err) {
        console.error("JSON parsing of translation reply failed:", err, "content:", content);
        throw new Error("Failed to parse translation response.");
      }

      invariant(
        parsed != null && "result" in parsed,
        "The translation result is missing in the reply.",
      );

      return String(parsed.result);
    },
    [Symbol.dispose]: () => {
      try {
        if (typeof engine.unload === "function") {
          engine.unload();
        }
      } catch (err) {
        console.error("engine.unload failed:", err);
      }
    },
  };
}
