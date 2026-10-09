import { useEffect, useState } from "react";
import type { ContentResult } from "@/lib/quranpedia/client";
import { loadReaderContent } from "../services/reader-service";
import type { ReaderContent } from "../types/reader";

export function useReaderContent() {
    const [content, setContent] = useState<ContentResult<ReaderContent> | null>(
        null,
    );
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState(true);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        let active = true;
        void loadReaderContent({ forceRefresh: revision > 0 })
            .then((result) => {
                if (active) {
                    setContent(result);
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
    }, [revision]);

    const refresh = () => {
        setLoading(true);
        setError(null);
        setRevision((value) => value + 1);
    };
    return { content, error, loading, refresh };
}
