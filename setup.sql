-- Enable RLS on tables we are about to create (good practice to do it explicitly, though they are tables)
-- Actually, tables need to be created first.

-- 1. Create `decks` table
CREATE TABLE IF NOT EXISTS public.decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    topic TEXT,
    original_text TEXT NOT NULL
);

-- 2. Create `flashcards` table
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    difficulty TEXT DEFAULT 'Medium',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- 4. Create permissive policies for MVP (allow public access)
-- Decks
CREATE POLICY "Enable read access for all users" ON public.decks
    FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.decks
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.decks
    FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.decks
    FOR DELETE USING (true);

-- Flashcards
CREATE POLICY "Enable read access for all users" ON public.flashcards
    FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.flashcards
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.flashcards
    FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.flashcards
    FOR DELETE USING (true);

-- 5. Insert Mock Data: "History of Rome"
DO $$
DECLARE
    rome_deck_id UUID;
BEGIN
    -- Insert Deck
    INSERT INTO public.decks (topic, original_text)
    VALUES (
        'History of Rome', 
        'Legend says Romulus and Remus founded Rome. The city was built on seven hills. Latin was the language. The Colosseum hosted gladiators. Augustus was the first emperor.'
    )
    RETURNING id INTO rome_deck_id;

    -- Insert Flashcards
    INSERT INTO public.flashcards (deck_id, front, back, difficulty)
    VALUES
    (
        rome_deck_id,
        'According to legend, who were the twin brothers raised by a she-wolf who founded Rome?',
        'Romulus and Remus',
        'Easy'
    ),
    (
        rome_deck_id,
        'On how many hills was the ancient city of Rome famously built?',
        'Seven hills',
        'Easy'
    ),
    (
        rome_deck_id,
        'What was the primary language spoken by the ancient Romans?',
        'Latin',
        'Medium'
    ),
    (
        rome_deck_id,
        'What famous structure in Rome was used for gladiator contests and other public spectacles?',
        'The Colosseum',
        'Medium'
    ),
    (
        rome_deck_id,
        'Who was the first emperor of the Roman Empire?',
        'Augustus (Octavian)',
        'Hard'
    );
END $$;
