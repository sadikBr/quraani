import { BookView } from './books';
import { FatwasView } from './fatwas';
import { MeaningsView } from './meanings';
import { NotesView, SayingsView } from './notes';
import { QiraatView } from './qiraat';
import { BOOK_SCIENCES, type Science } from './sciences';
import type { ScienceProps } from './shared';
import { SimilarView } from './similar';
import { TopicsView } from './topics';
import { TranslationsView } from './translations';

/** What opens behind each door of the arcade. */
export function ScienceView({ science, ...props }: ScienceProps & { science: Science }) {
  const service = BOOK_SCIENCES[science];
  if (service) return <BookView key={service} service={service} {...props} />;
  switch (science) {
    case 'meanings': return <MeaningsView {...props} />;
    case 'translations': return <TranslationsView {...props} />;
    case 'qiraat': return <QiraatView {...props} />;
    case 'similar': return <SimilarView {...props} />;
    case 'sayings': return <SayingsView {...props} />;
    case 'notes': return <NotesView {...props} />;
    case 'topics': return <TopicsView {...props} />;
    case 'fatwa': return <FatwasView {...props} />;
    default: return null;
  }
}
