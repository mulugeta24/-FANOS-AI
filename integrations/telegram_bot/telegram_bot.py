"""
FANOS AI — Telegram Threat Intelligence Bot
===========================================
Production-ready Telegram Bot integrated with the FANOS AI platform.
Utilizes the unified ML URL Threat Detector and VirusTotal intelligence service.
"""
import os
import sys
import logging
from collections import defaultdict
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add backend to Python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.services.threat_detection.url_detector import url_detector
from app.services.threat_detection.virustotal_service import virustotal_service

# Load environment
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
load_dotenv()

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
log = logging.getLogger("fanos_telegram_bot")


async def start_command(update, context):
    """Handle /start command."""
    welcome_text = (
        "🛡️ *FANOS AI Threat Intelligence Bot*\n\n"
        "Send me any URL to analyze for security threats.\n\n"
        "Features:\n"
        "• 17-feature XGBoost ML classification\n"
        "• VirusTotal threat intelligence\n"
        "• Detection categories: Benign, Phishing, Malware, Defacement\n\n"
        "Example: `https://example.com`"
    )
    await update.message.reply_text(welcome_text, parse_mode="Markdown")


async def analyze_url_message(update, context):
    """Analyze URL sent by user."""
    url = update.message.text.strip()
    if not (url.startswith("http://") or url.startswith("https://") or "." in url):
        await update.message.reply_text("Please provide a valid URL (e.g., https://example.com).")
        return

    await update.message.reply_text("🔍 Analyzing URL with FANOS AI Threat Engine...")

    try:
        # ML classification
        ml_res = url_detector.predict(url)
        ml_label = ml_res["label"]
        ml_conf = ml_res["confidence"]

        # VirusTotal
        vt_res, _ = await virustotal_service.scan_url(url)

        # Hybrid synthesis
        final_verdict, reasoning = virustotal_service.synthesize_verdict(
            vt_result=vt_res,
            ml_label=ml_label,
            ml_confidence=ml_conf,
        )

        verdict_emoji = "✅" if final_verdict == "benign" else "🚨"
        response = (
            f"{verdict_emoji} *Verdict: {final_verdict.upper()}*\n\n"
            f"• *URL:* `{url}`\n"
            f"• *ML Prediction:* {ml_label.capitalize()} ({ml_conf * 100:.1f}% confidence)\n"
            f"• *VirusTotal:* {vt_res.capitalize()}\n"
            f"• *Summary:* {reasoning}\n\n"
            f"_Powered by FANOS AI Unified Platform_"
        )
        await update.message.reply_text(response, parse_mode="Markdown")
    except Exception as e:
        log.error("URL analysis failed in telegram bot", error=str(e))
        await update.message.reply_text(f"⚠️ Error analyzing URL: {str(e)}")


def main():
    if not TOKEN:
        log.warning("TELEGRAM_BOT_TOKEN is not configured in .env. Bot startup paused.")
        print("To run the Telegram Bot, set TELEGRAM_BOT_TOKEN in .env.")
        return

    try:
        from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters
        app = ApplicationBuilder().token(TOKEN).build()
        app.add_handler(CommandHandler("start", start_command))
        app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), analyze_url_message))
        print("FANOS AI Telegram Bot is running...")
        app.run_polling()
    except Exception as e:
        log.error("Failed to run Telegram Bot", error=str(e))


if __name__ == "__main__":
    main()
