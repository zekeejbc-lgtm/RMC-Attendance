import { describe, expect, it } from 'vitest';
import {
  MEMBER_CSV_COLUMNS,
  createMemberCsvTemplate,
  parseMemberCsv,
  validateMemberCsvRows,
} from './memberCsv';

describe('member CSV contract', () => {
  it('downloads an Excel-compatible UTF-8 template with CRLF records', () => {
    const csv = createMemberCsvTemplate();

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toBe(`\uFEFF${MEMBER_CSV_COLUMNS.join(',')}\r\n`);
    expect(csv.replaceAll('\r\n', '')).not.toContain('\n');
  });

  it('parses BOM-prefixed normalized headers and RFC 4180 quoted fields', () => {
    const csv = '\uFEFFLegal Name,Email Address,Username,Student ID,Role,Phone,Guardian Name,Guardian Contact,Guardian Email\r\n'
      + '"Dela Cruz, Juan",juan@example.edu,JUAN.DC,RMC-001,,"+63 900 000 0000","Cruz, Maria","0917,123","maria@example.edu"\r\n'
      + '"Reyes\nAna",ana@example.edu,ana.reyes,RMC-002,MAYOR,,,,\r\n';

    expect(parseMemberCsv(csv)).toEqual([
      {
        name: 'Dela Cruz, Juan',
        email: 'juan@example.edu',
        username: 'JUAN.DC',
        student_id: 'RMC-001',
        role: 'student',
        phone: '+63 900 000 0000',
        guardian_name: 'Cruz, Maria',
        guardian_contact: '0917,123',
        guardian_email: 'maria@example.edu',
      },
      {
        name: 'Reyes\nAna',
        email: 'ana@example.edu',
        username: 'ana.reyes',
        student_id: 'RMC-002',
        role: 'mayor',
        phone: '',
        guardian_name: '',
        guardian_contact: '',
        guardian_email: '',
      },
    ]);
  });

  it('rejects a file that omits a required header', () => {
    expect(() => parseMemberCsv('name,email,username\r\nAda,ada@example.edu,ada')).toThrow(/student_id/i);
  });

  it('reports field errors and case-insensitive duplicates on each affected row', () => {
    const rows = parseMemberCsv([
      MEMBER_CSV_COLUMNS.join(','),
      'Ada,not-an-email,Same,RMC-1,president,,,,',
      'Grace,grace@example.edu,same,rmc-1,student,,,,',
    ].join('\r\n'));

    const result = validateMemberCsvRows(rows);

    expect(result.valid).toBe(false);
    expect(result.rows[0].errors).toEqual(expect.objectContaining({
      email: expect.stringMatching(/valid email/i),
      role: expect.stringMatching(/student or mayor/i),
      username: expect.stringMatching(/duplicate/i),
      student_id: expect.stringMatching(/duplicate/i),
    }));
    expect(result.rows[1].errors.username).toMatch(/duplicate/i);
    expect(result.rows[1].errors.student_id).toMatch(/duplicate/i);
  });

  it('ignores empty records and requires at least one person', () => {
    expect(parseMemberCsv(`${MEMBER_CSV_COLUMNS.join(',')}\r\n\r\n`)).toEqual([]);
    expect(validateMemberCsvRows([])).toEqual({ valid: false, rows: [], fileError: 'Add at least one person to the CSV file.' });
  });

  it('requires officers to choose at most one mayor in a section import', () => {
    const rows = parseMemberCsv(`${MEMBER_CSV_COLUMNS.join(',')}\r\nAda,ada@example.edu,ada,RMC-1,mayor,,,,\r\nGrace,grace@example.edu,grace,RMC-2,mayor,,,,`);

    const result = validateMemberCsvRows(rows);

    expect(result.valid).toBe(false);
    expect(result.rows[0].errors.role).toMatch(/only one mayor/i);
    expect(result.rows[1].errors.role).toMatch(/only one mayor/i);
  });

  it('flags identities that already belong to an existing account', () => {
    const rows = parseMemberCsv(`${MEMBER_CSV_COLUMNS.join(',')}\r\nAda,existing@example.edu,new-user,RMC-NEW,student,,,,`);

    const result = validateMemberCsvRows(rows, [{
      email: 'EXISTING@example.edu', username: 'existing-user', student_id: 'RMC-OLD',
    }]);

    expect(result.valid).toBe(false);
    expect(result.rows[0].errors.email).toMatch(/already exists/i);
  });

  it.each([
    ['quote inside an unquoted field', 'name,email,username,student_id\r\nA"da,ada@example.edu,ada,RMC-1'],
    ['characters after a closing quote', 'name,email,username,student_id\r\n"Ada"x,ada@example.edu,ada,RMC-1'],
    ['inconsistent record width', 'name,email,username,student_id\r\nAda,ada@example.edu,ada'],
    ['duplicate mapped headers', 'name,legal_name,email,username,student_id\r\nAda,Ada,ada@example.edu,ada,RMC-1'],
  ])('rejects malformed CSV with %s', (_case, csv) => {
    expect(() => parseMemberCsv(csv)).toThrow(/CSV|column|field|header/i);
  });
});
