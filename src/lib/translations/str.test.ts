import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  blockValue,
  decodeStr,
  diffStr,
  duplicateKeys,
  encodeStr,
  hotkeyOf,
  indexByKey,
  parseStr,
  placeholdersOf,
  serializeStr,
  unencodable,
  valueText,
} from './str';

const CRLF = '\r\n';
const sample = [
  '// String file for Lord of the Rings',
  '',
  'LETTER:G',
  '"G"',
  'END',
  '',
  'GUI:Age',
  '// context: Title for the age box',
  '"Age"',
  'END',
  '',
  'OBJECT:MordorPike',
  '"Orc Warrior"',
  'End',
  '',
  'OBJECT:MordorPike',
  '"Orc Pikeman"',
  'END',
  '',
  'CONTROLBAR:Tip',
  '"Line one\\nLine &two"  ;\\nleftover',
  'END',
  '',
  '///////////////',
  '',
  'END',
].join(CRLF);

describe('parseStr', () => {
  const parsed = parseStr(sample);

  it('finds every block and keeps comments inside them', () => {
    assert.equal(parsed.eol, CRLF);
    assert.equal(parsed.blocks.length, 5);
    assert.deepEqual(parsed.blocks[1]?.comments, [
      'context: Title for the age box',
    ]);
    assert.equal(blockValue(parsed, parsed.blocks[1] as never), '"Age"');
  });

  it('accepts End as a terminator and flags the trailing bare END', () => {
    assert.equal(parsed.blocks[2]?.key, 'OBJECT:MordorPike');
    assert.equal(parsed.trailingEnd, 25);
    assert.deepEqual(
      parsed.issues.map((i) => i.kind),
      ['trailing', 'stray-end'],
    );
  });

  it('last occurrence wins, and duplicates are reported', () => {
    assert.equal(indexByKey(parsed).get('OBJECT:MordorPike'), '"Orc Pikeman"');
    assert.deepEqual(duplicateKeys(parsed), [
      {
        key: 'OBJECT:MordorPike',
        count: 2,
        distinct: ['"Orc Warrior"', '"Orc Pikeman"'],
      },
    ]);
  });

  it('extracts the shown text between the outer quotes', () => {
    assert.equal(
      valueText('"Line one\\nLine &two"  ;\\nleftover'),
      'Line one\\nLine &two',
    );
    assert.equal(valueText('nope'), null);
  });

  it('flags unterminated blocks and broken keys', () => {
    const broken = parseStr(
      [
        'CONTROLBAR:Tip|',
        '"x"',
        'END',
        'NOCOLON',
        '"y"',
        'END',
        'GUI:Open',
        '"z"',
      ].join('\n'),
    );
    assert.deepEqual(
      broken.issues.map((i) => [i.kind, i.key]),
      [
        ['odd-key', 'CONTROLBAR:Tip|'],
        ['no-colon', 'NOCOLON'],
        ['unterminated', 'GUI:Open'],
      ],
    );
    assert.equal(broken.eol, '\n');
  });
});

describe('serializeStr', () => {
  const parsed = parseStr(sample);

  it('replaces only the value lines, all repeats included, and appends before the trailing END', () => {
    const out = serializeStr({
      base: parsed,
      overrides: new Map([
        ['OBJECT:MordorPike', 'Piquero orco'],
        ['CONTROLBAR:Tip', 'Nuevo'],
      ]),
      appended: [{ key: 'GUI:Extra', value: '"Extra"' }],
      header: ['Frikiparty', 'base 9.3.3'],
      appendedHeader: 'Claves que faltan',
    });
    const lines = out.split(CRLF);
    assert.deepEqual(lines.slice(0, 4), [
      '// Frikiparty',
      '// base 9.3.3',
      '',
      '// String file for Lord of the Rings',
    ]);
    assert.equal(lines.filter((l) => l === '"Piquero orco"').length, 2);
    assert.ok(lines.includes('"Nuevo"'));
    assert.ok(!out.includes('leftover'));
    assert.deepEqual(lines.slice(-9), [
      '///////////////',
      '',
      '// Claves que faltan',
      '',
      'GUI:Extra',
      '"Extra"',
      'END',
      '',
      'END',
    ]);
  });

  it('is the identity with nothing to change', () => {
    const out = serializeStr({
      base: parsed,
      overrides: new Map(),
      appended: [],
      header: [],
    });
    assert.equal(out, sample);
  });
});

describe('windows-1252', () => {
  it('round-trips the accented characters the game uses', () => {
    const text = 'Dáin Pie de Hierro… ¡Ñandú! Nazgûl';
    assert.equal(decodeStr(encodeStr(text)), text);
    assert.deepEqual(unencodable(text), []);
  });

  it('reports what cannot be encoded', () => {
    assert.deepEqual(unencodable('Fëanor → Ω'), ['→', 'Ω']);
    assert.equal(decodeStr(encodeStr('a→b')), 'a?b');
  });
});

describe('editing helpers', () => {
  it('reads hotkeys and placeholders', () => {
    assert.equal(hotkeyOf('Ambush For&mation'), 'm');
    assert.equal(hotkeyOf('No hotkey'), null);
    assert.deepEqual(placeholdersOf('%d Days and %s'), ['%d', '%s']);
  });
});

/**
 * The real 9.3.3 files, when present in .str-samples/ (not committed):
 * parse counts, the corrupted Spanish key, and a byte-exact round trip.
 */
const samples = {
  en: '.str-samples/en-9.3.3.str',
  es: '.str-samples/es-9.3.3.str',
};

describe('real 9.3.3 files', { skip: !existsSync(samples.en) }, () => {
  const en = parseStr(decodeStr(readFileSync(samples.en)));
  const es = parseStr(decodeStr(readFileSync(samples.es)));

  it('parses every block of both files', () => {
    assert.equal(en.blocks.length, 23748);
    assert.equal(es.blocks.length, 23748);
    assert.equal(indexByKey(en).size, 23557);
    assert.equal(duplicateKeys(en).length, 188);
    assert.equal(en.issues.filter((i) => i.kind === 'unterminated').length, 0);
    assert.ok(en.trailingEnd !== null);
  });

  it('spots the corrupted Spanish key and the 9.3.3 diff', () => {
    assert.ok(
      es.issues.some(
        (i) =>
          i.kind === 'odd-key' &&
          i.key === 'CONTROLBAR:ToolTipConstructMirkwoodCaveEntr|',
      ),
    );
    const diff = diffStr(indexByKey(en), indexByKey(es));
    assert.deepEqual(diff.removed, [
      'CONTROLBAR:ToolTipConstructMirkwoodCaveEntranceExpansion',
    ]);
    assert.equal(diff.added.length, 1);
    assert.equal(diff.changed.length, 21929);
  });

  it('round-trips the Spanish file byte for byte', () => {
    const bytes = readFileSync(samples.es);
    const out = serializeStr({
      base: es,
      overrides: new Map(),
      appended: [],
      header: [],
    });
    assert.deepEqual(Buffer.from(encodeStr(out)), bytes);
  });
});
