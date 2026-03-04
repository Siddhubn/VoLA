import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type'); // 'index' or 'syllabus'
  const tradeType = searchParams.get('tradeType'); // 'TT' or 'TP'

  if (!type || !tradeType) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  // Construct file path
  const fileName = `${type}.pdf`;
  const filePath = path.join(
    process.cwd(),
    'electrician-sep-modules',
    tradeType,
    'curriculum',
    fileName
  );

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: 'PDF file not found' },
      { status: 404 }
    );
  }

  // Read file
  const fileBuffer = fs.readFileSync(filePath);

  // Return PDF
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
    },
  });
}
