export type LastDraw = {
  drawId: number;
  drawDate: string;
  nextDrawDate: string | null;
  drawNumbers: number[];
  drawNumbersCsv: string;
  countdownSeconds: number | null;
  rawXml: string;
};

const SOAP_URL = 'https://eklubkeno.etipos.sk/keno5service.asmx';
const SOAP_ACTION = 'http://tempuri.org/GetLastDraw';

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractTag(xml: string, tag: string): string | null {
  const patterns = [
    new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'),
    new RegExp(`<\\w+:${tag}\\b[^>]*>([\\s\\S]*?)<\\/\\w+:${tag}>`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match?.[1] != null) {
      return decodeXmlEntities(match[1]).trim();
    }
  }

  return null;
}

function parseNumbers(raw: string | null): number[] {
  if (!raw) return [];

  return raw
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item));
}

function parseEtiposDate(raw: string): string {
  const trimmed = raw.trim();

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  // Format: 16.03.2026.20.36.00
  const dottedDateTime = trimmed.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})\.(\d{1,2})\.(\d{1,2})\.(\d{1,2})$/
  );

  if (dottedDateTime) {
    const [, day, month, year, hour, minute, second] = dottedDateTime;

    const parsed = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      )
    );

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  // Format: 16.03.2026 20:36:00 or similar
  const skFormat = trimmed.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (skFormat) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] = skFormat;

    const parsed = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      )
    );

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  throw new Error(`Could not parse eTIPOS date value: ${raw}`);
}

export async function fetchLastDraw(): Promise<LastDraw> {
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/" xmlns:tns="http://tempuri.org/" xmlns:types="http://tempuri.org/encodedTypes" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
    <tns:GetLastDraw />
  </soap:Body>
</soap:Envelope>`;

  const response = await fetch(SOAP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: SOAP_ACTION,
    },
    body: soapBody,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`eTIPOS request failed with status ${response.status}`);
  }

  const rawXml = await response.text();

  const drawIdRaw = extractTag(rawXml, 'DrawId');
  const drawDateRaw = extractTag(rawXml, 'DrawDate');
  const nextDrawDateRaw = extractTag(rawXml, 'NextDrawDate');
  const drawNumbersRaw = extractTag(rawXml, 'DrawNumbers');
  const countdownRaw =
    extractTag(rawXml, 'NextDrawCountdown') ?? extractTag(rawXml, 'Countdown');

  const drawId = Number(drawIdRaw);
  if (!Number.isInteger(drawId)) {
    throw new Error(
      `Could not parse DrawId from SOAP response. Raw value: ${drawIdRaw ?? 'null'}`
    );
  }

  if (!drawDateRaw) {
    throw new Error('Could not parse DrawDate from SOAP response');
  }

  const drawNumbers = parseNumbers(drawNumbersRaw);
  if (drawNumbers.length === 0) {
    throw new Error(
      `Could not parse DrawNumbers from SOAP response. Raw value: ${drawNumbersRaw ?? 'null'}`
    );
  }

  return {
    drawId,
    drawDate: parseEtiposDate(drawDateRaw),
    nextDrawDate: nextDrawDateRaw ? parseEtiposDate(nextDrawDateRaw) : null,
    drawNumbers,
    drawNumbersCsv: drawNumbers.join(','),
    countdownSeconds:
      countdownRaw && !Number.isNaN(Number(countdownRaw))
        ? Number(countdownRaw)
        : null,
    rawXml,
  };
}
