import { useReadingPreferences } from '../state/reading-preferences-provider';
import { RIWAYAT, type Riwayah } from '../riwayat';
import { useEffect, useState } from "react";
import type { ContentResult } from "@/lib/quranpedia/client";
import { loadReaderContent } from "../services/reader-service";
import type { ReaderContent } from "../types/reader";

interface Outcome {
    riwayah: Riwayah;
    revision: number;
    error?: Error;
}

export function useReaderContent() {
    const { preferences: { riwayah } } = useReadingPreferences();
    const [content, setContent] = useState<ContentResult<ReaderContent> | null>(
        null,
    );
    // Manual refreshes and outcomes belong to one riwayah: switching editions
    // neither forces a network fetch nor shows the other edition's error.
    const [refreshes, setRefreshes] = useState({ riwayah, revision: 0 });
    if (refreshes.riwayah !== riwayah) setRefreshes({ riwayah, revision: 0 });
    const revision = refreshes.riwayah === riwayah ? refreshes.revision : 0;
    const [outcome, setOutcome] = useState<Outcome | null>(null);

    useEffect(() => {
        let active = true;
        void loadReaderContent({ forceRefresh: revision > 0 }, riwayah)
            .then((result) => {
                if (active) {
                    setContent(result);
                    setOutcome({ riwayah, revision });
                }
            })
            .catch((error) => {
                if (active) {
                    setOutcome({
                        riwayah,
                        revision,
                        error:
                            error instanceof Error
                                ? error
                                : new Error("Unable to load Quran"),
                    });
                }
            });
        return () => {
            active = false;
        };
    }, [revision, riwayah]);

    const refresh = () => {
        setRefreshes((value) => ({
            riwayah,
            revision: (value.riwayah === riwayah ? value.revision : 0) + 1,
        }));
    };
    const settled = outcome?.riwayah === riwayah && outcome.revision === revision;
    const error = settled ? outcome.error ?? null : null;
    const matches = content?.data.quran.id === RIWAYAT[riwayah].mushafId;
    return { content: matches ? content : null, error, loading: !settled, refresh };
}
