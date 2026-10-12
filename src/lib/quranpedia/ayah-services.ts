import { QuranpediaError } from './errors';
import { relatedPlainText } from './related-content';

/**
 * What Quranpedia holds for one ayah, beyond its text (`/v1/ayah/{surah}/{ayah}/{service}`, the
 * ayah numbered as in Hafs): the books that treat it (tafsir, i'rab, the reasons of revelation,
 * what abrogates or is abrogated, its ambiguities), each read through `/book/{id}`; and content
 * given whole: the meanings of its rare words, the ayahs that resemble it, its qira'at, the
 * topics it belongs to, fatwas, reflections and the narrations about it. The services are not
 * documented by the source; these decoders take what the responses carry, keep what is well
 * formed and skip the rest, so one odd entry does not hide the others.
 */

/** Services answered by a list of books, each read with `/ayah/{s}/{a}/book/{id}`. */
export type BookService = 'tafsir' | 'e3rab' | 'asbab' | 'nasekh' | 'mutshabeh';
export const BOOK_SERVICES: readonly BookService[] = ['tafsir', 'e3rab', 'asbab', 'nasekh', 'mutshabeh'];

export interface ServiceBook {
  id: number;
  name: string;
  author: string;
  /** The author's death, in years of the Hijra, when known. */
  year: number | null;
  /** Counted by the source among the reference works of its kind. */
  fundamental: boolean;
}
export interface WordMeaning { word: string; meaning: string }
export interface MeaningsBook { book: { id: number; name: string; author: string }; words: WordMeaning[] }
/** An ayah by its place in the Hafs numbering, as the services give it. */
export interface HafsReference { surah: number; ayah: number }
export interface SimilarAyah extends HafsReference { surahName: string; text: string }
/** Ayahs that resemble one another, with a note for telling them apart, and videos about them. */
export interface SimilarGroup { note: string; ayahs: SimilarAyah[]; videos: string[] }
export interface QiraaRawi { id: number; name: string; qiraa: string; audio: string | null }
export interface QiraaReading { text: string; rawis: QiraaRawi[] }
/** A word of the ayah read in more than one way, and how each rawi reads it. */
export interface QiraaWord { word: string; readings: QiraaReading[] }
export interface Topic { id: number; name: string; parent: { id: number; name: string } | null; ayahs: HafsReference[] }
export interface Fatwa { id: number; question: string; answer: string; muftis: string[] }
export interface AyahNote { id: number; text: string; author: string; category: string; images: string[]; videos: string[] }
/** A narration about the ayah: what a companion or a successor said of it, or of its revelation. */
export interface Saying { id: number; title: string; kind: string; text: string; narrators: string[] }
export interface TranslationLanguage { code: string; name: string; localName: string; direction: 'rtl' | 'ltr' }

type Entry = Record<string, unknown>;
const isEntry = (value: unknown): value is Entry => !!value && typeof value === 'object' && !Array.isArray(value);
const list = (value: unknown, what: string): unknown[] => {
  if (!Array.isArray(value)) throw new QuranpediaError('invalid-response', `Invalid ${what}`);
  return value;
};
const entries = (value: unknown): Entry[] => Array.isArray(value) ? value.filter(isEntry) : [];
const id = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
const text = (value: unknown) => typeof value === 'string' ? value.replace(/﻿/g, '').trim() : '';
const prose = (value: unknown) => typeof value === 'string' ? relatedPlainText(value.replace(/﻿/g, '')) : '';
/** Links are followed or played only over https. */
const link = (value: unknown) => typeof value === 'string' && /^https:\/\/[^\s]+$/.test(value) ? value : null;
const names = (value: unknown) => entries(value).map((person) => text(person.ar_name ?? person.name)).filter(Boolean);
const authorOf = (value: unknown) => typeof value === 'string' ? text(value) : isEntry(value) ? text(value.ar_name) : '';
const unique = <T>(values: T[]) => [...new Set(values)];

export function decodeServiceBooks(value: unknown): ServiceBook[] {
  return list(value, 'book list').filter(isEntry).flatMap((book) => {
    const bookId = id(book.id), name = text(book.name);
    if (!bookId || !name) return [];
    const year = typeof book.year === 'number' && Number.isFinite(book.year) && book.year > 0 ? book.year : null;
    return [{ id: bookId, name, author: authorOf(book.author), year, fundamental: book.fundamental === 1 || book.fundamental === true }];
  });
}

export function decodeMeanings(value: unknown): MeaningsBook[] {
  return list(value, 'meanings').filter(isEntry).flatMap((entry) => {
    const info = isEntry(entry.book_info) ? entry.book_info : {};
    const bookId = id(info.id), name = text(info.name);
    const words = entries(entry.words).map((word) => ({ word: text(word.text), meaning: prose(word.meaning) })).filter((word) => word.word && word.meaning);
    return bookId && name && words.length ? [{ book: { id: bookId, name, author: authorOf(info.author) }, words }] : [];
  });
}

const videoLinks = (value: unknown) => unique(entries(value).map((video) => link(video.url ?? video.file_name)).filter((url): url is string => !!url));

export function decodeSimilar(value: unknown): SimilarGroup[] {
  return list(value, 'similar ayahs').filter(isEntry).flatMap((group) => {
    const ayahs = entries(group.ayahs).flatMap((entry) => {
      const info = isEntry(entry.info) ? entry.info : {};
      const surah = isEntry(info.surah) ? info.surah : {};
      const surahNumber = id(surah.id ?? info.surah_id), ayah = id(info.number);
      if (!surahNumber || surahNumber > 114 || !ayah) return [];
      return [{ surah: surahNumber, ayah, surahName: text(surah.name), text: text(info.text) }];
    });
    return ayahs.length ? [{ note: prose(group.notes), ayahs, videos: videoLinks(group.youtube) }] : [];
  });
}

export function decodeQiraat(value: unknown): QiraaWord[] {
  return list(value, 'qiraat').filter(isEntry).flatMap((entry) => {
    const readings = entries(entry.qiraat).flatMap((reading) => {
      const rawis = entries(reading.rewayat).flatMap((riwayah) => {
        const rawi = isEntry(riwayah.rawi) ? riwayah.rawi : {};
        const qiraa = isEntry(rawi.qiraa) ? rawi.qiraa : {};
        const rawiId = id(rawi.id), name = text(rawi.name);
        return rawiId && name ? [{ id: rawiId, name, qiraa: text(qiraa.short_name), audio: link(riwayah.audio) }] : [];
      });
      const said = prose(reading.qiraa_text);
      return said ? [{ text: said, rawis }] : [];
    });
    const word = text(entry.ayah_word);
    return word && readings.length ? [{ word, readings }] : [];
  });
}

/** "2:58,2:189,4:154" */
export function parseHafsReferences(value: unknown): HafsReference[] {
  if (typeof value !== 'string') return [];
  return value.split(',').flatMap((part) => {
    const match = /^\s*(\d{1,3}):(\d{1,3})\s*$/.exec(part);
    const surah = match ? Number(match[1]) : 0, ayah = match ? Number(match[2]) : 0;
    return surah >= 1 && surah <= 114 && ayah >= 1 ? [{ surah, ayah }] : [];
  });
}

export function decodeTopics(value: unknown): Topic[] {
  return list(value, 'topics').filter(isEntry).flatMap((topic) => {
    const topicId = id(topic.id), name = text(topic.name);
    if (!topicId || !name) return [];
    const parent = isEntry(topic.parent) && id(topic.parent.id) && text(topic.parent.name) ? { id: id(topic.parent.id)!, name: text(topic.parent.name) } : null;
    return [{ id: topicId, name, parent, ayahs: parseHafsReferences(topic.related_ayahs ?? topic.ayahs) }];
  });
}

export function decodeFatwas(value: unknown): Fatwa[] {
  return list(value, 'fatwas').filter(isEntry).flatMap((entry) => {
    const fatwa = isEntry(entry.fatwa) ? entry.fatwa : entry;
    const fatwaId = id(entry.id);
    const question = prose(fatwa.question) || prose(fatwa.question_summary) || prose(fatwa.ar_question) || text(fatwa.ar_title);
    const answer = prose(fatwa.answer) || prose(fatwa.answer_summary) || prose(fatwa.ar_answer);
    return fatwaId && question && answer ? [{ id: fatwaId, question, answer, muftis: unique(names(entry.people ?? entry.mufti)) }] : [];
  });
}

export function decodeNotes(value: unknown): AyahNote[] {
  return list(value, 'notes').filter(isEntry).flatMap((note) => {
    const noteId = id(note.id), body = prose(note.ar_note ?? note.note);
    if (!noteId || !body) return [];
    const category = isEntry(note.category) ? text(note.category.name) : '';
    const images = unique(entries(note.images).map((image) => link(image.url)).filter((url): url is string => !!url));
    return [{ id: noteId, text: body, author: authorOf(note.author ?? note.writer), category, images, videos: videoLinks(note.youtube) }];
  });
}

export function decodeSayings(value: unknown): Saying[] {
  return list(value, 'sayings').filter(isEntry).flatMap((saying) => {
    const sayingId = id(saying.id), body = prose(saying.text);
    return sayingId && body ? [{ id: sayingId, title: text(saying.title), kind: text(saying.type), text: body, narrators: unique(entries(saying.narrators).map((person) => text(person.name)).filter(Boolean)) }] : [];
  });
}

export function decodeTranslationLanguages(value: unknown): TranslationLanguage[] {
  return list(value, 'languages').filter(isEntry).flatMap((language) => {
    const code = text(language.code);
    if (!/^[a-z]{2,3}$/.test(code)) return [];
    return [{ code, name: text(language.name) || code, localName: text(language.local_name) || text(language.en_name) || code, direction: language.direction === 'rtl' ? 'rtl' as const : 'ltr' as const }];
  });
}

/**
 * A YouTube link as the app opens it: the watch page (with its start time) rather than the
 * embedded player the source links to.
 */
export function watchLink(url: string) {
  const match = /^https:\/\/www\.youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})(?:\?(.*))?$/.exec(url);
  if (!match) return url;
  const start = /(?:^|&)start=(\d+)/.exec(match[2] ?? '')?.[1];
  return `https://www.youtube.com/watch?v=${match[1]}${start ? `&t=${start}s` : ''}`;
}
