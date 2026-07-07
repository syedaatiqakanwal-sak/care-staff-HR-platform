import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PolicyReadingSession } from './policy-reading-session.entity';

function formatDuration(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')} hours ${String(m).padStart(2, '0')} minutes ${String(sec).padStart(2, '0')} seconds`;
}

function formatTime(d: Date | null) {
  if (!d) return '-';
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateTime(d: Date | null) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-GB', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}

@Injectable()
export class PolicyReportService {
  createSessionReportPdf(session: PolicyReadingSession) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.fontSize(18).text('Policy Compliance Report', { align: 'center' });
    doc.moveDown(1.5);

    const staff = (session as any).staff;
    const staffName = staff ? `${staff.firstName || ''} ${staff.lastName || ''}`.trim() : '';
    const ilccs = staff?.ilccsNumber || '-';
    const policyTitle = (session as any).policy?.title || session.policyId;
    const status = (session as any).status || (session.endTime ? 'COMPLETED' : 'IN_PROGRESS');

    const rows: Array<[string, string]> = [
      ['Staff Name', staffName || '-'],
      ['ILCCS', ilccs],
      ['Policy Title', policyTitle],
      ['Version', String((session as any).policyVersion ?? '-')],
      ['Date', session.date],
      ['Day', session.day],
      ['Start Time', formatTime(session.startTime)],
      ['End Time', formatTime(session.endTime)],
      [
        'Total Duration',
        session.totalDurationSeconds != null ? formatDuration(session.totalDurationSeconds) : '-',
      ],
      ['Completion Status', String(status)],
    ];

    doc.fontSize(12);
    for (const [label, value] of rows) {
      doc.fillColor('#111').font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.fillColor('#333').font('Helvetica').text(value);
      doc.moveDown(0.4);
    }

    doc.moveDown(1.5);
    doc.fillColor('#888').fontSize(10).text(`Generated at: ${new Date().toLocaleString('en-GB')}`, { align: 'right' });

    return doc;
  }

  createMultiSessionReportPdf(sessions: PolicyReadingSession[]) {
    if (sessions.length === 0) {
      throw new Error('No sessions provided');
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Sort sessions by start time
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const firstSession = sortedSessions[0];
    const staff = (firstSession as any).staff;
    const staffName = staff ? `${staff.firstName || ''} ${staff.lastName || ''}`.trim() : '';
    const ilccs = staff?.ilccsNumber || '-';
    const policyTitle = (firstSession as any).policy?.title || firstSession.policyId;

    // Calculate total duration across all sessions
    const totalDurationSeconds = sortedSessions.reduce((sum, s) => {
      return sum + (s.totalDurationSeconds || 0);
    }, 0);

    // Header
    doc.fontSize(18).text('Policy Compliance Report', { align: 'center' });
    doc.moveDown(1.5);

    // Staff and Policy Information
    const infoRows: Array<[string, string]> = [
      ['Staff Name', staffName || '-'],
      ['ILCCS', ilccs],
      ['Policy Title', policyTitle],
      ['Version', String((firstSession as any).policyVersion ?? '-')],
      ['Date', firstSession.date],
      ['Day', firstSession.day],
      ['Total Sessions', String(sortedSessions.length)],
      ['Total Duration', formatDuration(totalDurationSeconds)],
      ['Completion Status', sortedSessions.every(s => s.status === 'COMPLETED' || s.endTime) ? 'COMPLETED' : 'IN_PROGRESS'],
    ];

    doc.fontSize(12);
    for (const [label, value] of infoRows) {
      doc.fillColor('#111').font('Helvetica-Bold').text(`${label}: `, { continued: true });
      doc.fillColor('#333').font('Helvetica').text(value);
      doc.moveDown(0.4);
    }

    doc.moveDown(1.5);
    doc.fillColor('#111').fontSize(14).font('Helvetica-Bold').text('Session Details:', { underline: true });
    doc.moveDown(0.8);

    // Session details table
    sortedSessions.forEach((session, index) => {
      const sessionStatus = (session as any).status || (session.endTime ? 'COMPLETED' : 'IN_PROGRESS');
      
      doc.fontSize(11);
      doc.fillColor('#111').font('Helvetica-Bold').text(`Session ${index + 1}:`, { continued: false });
      doc.moveDown(0.3);
      
      doc.fontSize(10);
      doc.fillColor('#333').font('Helvetica');
      doc.text(`  Start Time: ${formatDateTime(session.startTime)}`, { indent: 20 });
      doc.text(`  End Time: ${formatDateTime(session.endTime)}`, { indent: 20 });
      doc.text(`  Duration: ${session.totalDurationSeconds != null ? formatDuration(session.totalDurationSeconds) : '-'}`, { indent: 20 });
      doc.text(`  Status: ${sessionStatus}`, { indent: 20 });
      
      doc.moveDown(0.6);
    });

    doc.moveDown(1.5);
    doc.fillColor('#888').fontSize(10).text(`Generated at: ${new Date().toLocaleString('en-GB')}`, { align: 'right' });

    return doc;
  }
}

