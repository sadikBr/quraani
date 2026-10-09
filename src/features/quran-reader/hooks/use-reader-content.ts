import { useReadingPreferences } from '../state/reading-preferences-provider';
import { RIWAYAT } from '../riwayat';
import { useEffect, useState } from "react";
import type { ContentResult } from "@/lib/quranpedia/client";
import { loadReaderContent } from "../services/reader-service";
import type { ReaderContent } from "../types/reader";

export function useReaderContent() {
    const { preferences: { riwayah } } = useReadingPreferences();
    const [content, setContent] = useState<ContentResult<ReaderContent> | null>(
        null,
    );
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        let active = true;
        void loadReaderContent({ forceRefresh: revision > 0 }, riwayah)
            .then((result) => {
                if (active) {
                    setContent(result);
                    setError(null);
                    setLoading(false);
                }
            })
            .catch((error) => {
                if (active) {
                    setError(
                        error instanceof Error
                            ? error
                            : new Error("Unable to load Quran"),
                    );
                    setLoading(false);
                }
            });
        return () => {
            active = false;
        };
    }, [revision, riwayah]);

    const refresh = () => {
        setLoading(true);
        setError(null);
        setRevision((value) => value + 1);
    };
    const matches = content?.data.quran.id === RIWAYAT[riwayah].mushafId;
    return { content: matches ? content : null, error, loading: loading || (!matches && !error), refresh };
}
