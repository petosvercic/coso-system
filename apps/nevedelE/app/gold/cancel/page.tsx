import { createTranslator, detectLanguage } from "../../one-day/localization";

export default function GoldCancelPage() {
  const t = createTranslator(detectLanguage());

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-xl text-center text-neutral-800">
        <h1 className="text-2xl font-semibold lowercase">{t("gold.cancel.title")}</h1>
        <p className="mt-4 text-base">{t("gold.cancel.text")}</p>
      </div>
    </main>
  );
}
