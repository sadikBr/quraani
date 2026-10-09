#!/usr/bin/env python3
"""Build offline color spans, never Quran text, from a pinned Warsh analysis.

Usage: python3 scripts/generate-warsh-tajweed.py --source /path/to/phonemizer
  --corpus /path/to/quranpedia-mushaf-4.json
Requires Python 3.11+ and PyYAML. See assets/tajweed/README.md.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import unicodedata
from collections import Counter
from pathlib import Path

COMMIT = 'c48980e051dd88f0919e3148021823a3da06d4b5'
# Shared rules use the reader's existing palette. Later entries win when a
# source unit carries several rules. Warsh hamza/inclination remains visible
# over a generic natural madd. No duration counts are inferred from a color.
RULES = {
    'madd_tabii': 'madda_normal', 'madd_iwad': 'madda_normal',
    'madd_silah': 'madda_normal', 'madd_yaa_zawaid': 'madda_normal',
    'madd_arid_lissukun': 'warsh_madd_stop', 'madd_leen': 'warsh_madd_stop',
    'madd_badal': 'warsh_badal', 'madd_leen_mahmuz': 'warsh_leen',
    'madd_munfasil': 'madda_permissible', 'madd_mim_al_jam': 'madda_permissible',
    'madd_muttasil': 'madda_obligatory', 'madd_lazim': 'madda_necessary',
    'qalqala_sughra': 'qlq', 'qalqala_kubra': 'qlq', 'qalqala_akbar': 'qlq',
    'ghunnah_mushaddadah': 'ghn', 'idgham_bi_ghunnah': 'idgh_ghn',
    'idgham_bila_ghunnah': 'idgh_w_ghn', 'idgham_shafawi': 'idghm_shfw',
    'ikhfaa': 'ikhf', 'ikhfaa_shafawi': 'ikhf_shfw', 'iqlab': 'iqlb',
    'ibdal_hamza': 'warsh_ibdal', 'tashil': 'warsh_tashil',
    'naql': 'warsh_naql', 'taqlil': 'warsh_taqlil', 'imala': 'warsh_imala',
}
IGNORED = {'\u06de', '\u200f', 'ـ'}


def canonical(text):
    """NFD-equivalent scalar alignment retaining original character positions.

    Only presentation tatweel, separators, RLM and rub markers are skipped.
    The two corpora have one composed maddah and one combining-order variant.
    Neither the source Quran nor the app's displayed text is rewritten.
    """
    result = []
    for index, char in enumerate(text):
        if char.isspace() or char in IGNORED:
            continue
        for part in unicodedata.normalize('NFD', char):
            result.append((part, index))
            ccc = unicodedata.combining(part)
            j = len(result) - 1
            while ccc and j and unicodedata.combining(result[j - 1][0]) > ccc:
                result[j - 1], result[j] = result[j], result[j - 1]
                j -= 1
    return result


def base36(n):
    value = ''
    while n:
        n, digit = divmod(n, 36)
        value = '0123456789abcdefghijklmnopqrstuvwxyz'[digit] + value
    return value or '0'


def fingerprint(text):
    a, b = 2166136261, 5381
    # This corpus is BMP-only, so Python scalars equal JS UTF-16 offsets.
    assert all(ord(char) <= 0xffff for char in text)
    for char in text:
        a = ((a ^ ord(char)) * 16777619) & 0xffffffff
        b = ((b * 33) ^ ord(char)) & 0xffffffff
    return f'{len(text)}-{base36(a)}-{base36(b)}'


def unit_color(unit, result):
    rules = {result.rule_occurrences[i.value].rule_id.value for i in unit.rule_occurrence_ids}
    # Only explicit silent source letters are grey. A rule's trigger must not
    # paint its sounded host grey (e.g. lam shamsiyyah's following consonant).
    color = 'slnt' if unit.silence is not None and unit.text and not all(unicodedata.combining(c) for c in unit.text) else None
    if 'tarqeeq' in rules and 'ر' in unit.text:
        color = 'warsh_ra'
    word = result.words[unit.word_id.value].text
    letters = ''.join(c for c in word if unicodedata.category(c).startswith('L') and c != 'ـ')
    if 'tafkheem' in rules and 'ل' in unit.text and not letters.endswith('لله'):
        # Use the classified lam, including sad/taa/zhaa and authored exceptions.
        # Generic emphasis in the divine name does not need a Warsh-only color.
        color = 'warsh_lam'
    for rule, mapped in RULES.items():
        if rule in rules:
            color = mapped
    return color


def build_ayah(reader, ref, original):
    result = reader.analyse(ref)
    source = result.source()
    left, right = canonical(source.text), canonical(original)
    if [c for c, _ in left] != [c for c, _ in right]:
        raise ValueError(f'{ref}: source differs from Quranpedia text')
    source_colors = [None] * len(source.text)
    for unit in source.units:
        color = unit_color(unit, result)
        if color:
            for start, end in unit.ranges:
                source_colors[start:end] = [color] * (end - start)
    colors = [None] * len(original)
    for (_, source_index), (_, target_index) in zip(left, right):
        if source_colors[source_index]:
            colors[target_index] = source_colors[source_index]
    # Tatweel has no recitation of its own; extend the preceding ink through it.
    for i, char in enumerate(original):
        if char == 'ـ' and i:
            colors[i] = colors[i - 1]
    spans = []
    for i, color in enumerate(colors):
        if not color:
            continue
        if spans and spans[-1][1] == i and spans[-1][2] == color:
            spans[-1][1] += 1
        else:
            spans.append([i, i + 1, color])
    return [fingerprint(original), spans]


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('--source', type=Path, required=True)
    args.add_argument('--corpus', type=Path, required=True)
    args.add_argument('--output', type=Path, default=Path('assets/tajweed/warsh-azraq-v1.json'))
    options = args.parse_args()
    actual = subprocess.check_output(['git', '-C', str(options.source), 'rev-parse', 'HEAD'], text=True).strip()
    if actual != COMMIT:
        raise SystemExit(f'Expected pinned annotator {COMMIT}; got {actual}')
    sys.path.insert(0, str(options.source))
    from quranic_phonemizer import Phonemizer
    reader = Phonemizer(riwayah='warsh')
    corpus_bytes = options.corpus.read_bytes()
    corpus = json.loads(corpus_bytes)
    assert corpus['id'] == 4 and len(corpus['surahs']) == 114
    rows, errors, counts = {}, [], Counter()
    for chapter in corpus['surahs']:
        for ayah in chapter['ayahs']:
            ref = f"{chapter['id']}:{ayah['number']}"
            try:
                rows[ref] = build_ayah(reader, ref, ayah['text'])
                counts.update(span[2] for span in rows[ref][1])
            except Exception as error:
                errors.append([ref, str(error)])
        print(f"Surah {chapter['id']}: {len(rows)} ayahs aligned, {len(errors)} errors", flush=True)
    if errors:
        Path('/tmp/quranni-warsh-annotation-errors.json').write_text(json.dumps(errors, ensure_ascii=False, indent=2))
        raise SystemExit(f'{len(errors)} failures; no production data written. See /tmp/quranni-warsh-annotation-errors.json')
    assert len(rows) == 6214
    rules = sorted(counts)
    for _, spans in rows.values():
        for span in spans:
            span[2] = rules.index(span[2])
    output = dict(version=1, mushafId=4, route='warsh-al-azraq', boundary='stop-at-each-ayah',
                  annotator=COMMIT, corpusSha256=hashlib.sha256(corpus_bytes).hexdigest(),
                  variants=reader.analyse('1:1').analysis.variant, rules=rules, ayahs=rows)
    options.output.parent.mkdir(parents=True, exist_ok=True)
    options.output.write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps(dict(ayahs=len(rows), spans=sum(counts.values()), colors=counts, bytes=options.output.stat().st_size), indent=2))


if __name__ == '__main__':
    main()
