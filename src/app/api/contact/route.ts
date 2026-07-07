import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for contact submissions (demo purposes)
// In production, this would send to an email service or save to DB
const submissions: Array<{
  name: string;
  email: string;
  subject: string;
  message: string;
  timestamp: string;
}> = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Store submission
    submissions.push({
      name: name.trim(),
      email: email.trim(),
      subject: (subject as string || 'General Inquiry').trim(),
      message: message.trim(),
      timestamp: new Date().toISOString(),
    });

    // In production, you would:
    // 1. Send email via SendGrid/Resend/Mailgun
    // 2. Save to database
    // 3. Send to CRM
    // 4. Send auto-reply to user

    return NextResponse.json({
      success: true,
      message: 'Thank you for your message. We will get back to you within 24 hours.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    total: submissions.length,
    // Don't expose actual submissions in production
  });
}
