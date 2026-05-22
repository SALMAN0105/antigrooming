import sys
import asyncio
from grooming_scorer import analyze_text

async def main():
    result = await analyze_text("kirim foto tanpa busana dong")
    print(f"Risk Level: {result.risk_level}")
    print(f"Detected: {result.detected}")

asyncio.run(main())
