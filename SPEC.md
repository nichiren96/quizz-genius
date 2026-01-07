# QuizGenius Specification

## 1. Database Schema (Supabase)

We will use PostgreSQL (via Supabase) with the following schema.

### Tables

#### `decks`
Stores collections of flashcards generated from a specific source text.

| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | Primary Key |
| `created_at` | `timestamptz` | `now()` | Creation timestamp |
| `topic` | `text` | `NULL` | Optional topic/title for the deck (inferred or user-provided) |
| `original_text`| `text` | `NOT NULL` | The source text used to generate the deck |

#### `flashcards`
Individual flashcards belonging to a deck.

| Column | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | Primary Key |
| `deck_id` | `uuid` | `NOT NULL` | Foreign Key -> `decks.id` (ON DELETE CASCADE) |
| `front` | `text` | `NOT NULL` | Question or concept |
| `back` | `text` | `NOT NULL` | Answer or definition |
| `difficulty` | `text` | `'Medium'` | 'Easy', 'Medium', 'Hard' |
| `created_at` | `timestamptz` | `now()` | Creation timestamp |

---

## 2. AI JSON Interface (Gemini API)

The interaction with the Google Gemini API will request a structured JSON response.

### System Prompt
`You are a helpful assistant that converts text into study flashcards. Output strictly valid JSON.`

### Request
The user input text will be sent to the model.

### Response Schema (Strict JSON)
```json
{
  "type": "object",
  "properties": {
    "topic": {
      "type": "string",
      "description": "A short, relevant title for this set of flashcards based on the content."
    },
    "flashcards": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "front": {
            "type": "string",
            "description": "The question or concept to be tested."
          },
          "back": {
            "type": "string",
            "description": "The answer or definition."
          },
          "difficulty": {
            "type": "string",
            "enum": ["Easy", "Medium", "Hard"],
            "description": "Estimated difficulty level of the question."
          }
        },
        "required": ["front", "back", "difficulty"]
      }
    }
  },
  "required": ["topic", "flashcards"]
}
```

### Example Output
```json
{
  "topic": "Photosynthesis",
  "flashcards": [
    {
      "front": "What is the primary pigment used in photosynthesis?",
      "back": "Chlorophyll",
      "difficulty": "Easy"
    },
    {
      "front": "What are the two main stages of photosynthesis?",
      "back": "Light-dependent reactions and the Calvin cycle",
      "difficulty": "Medium"
    }
  ]
}
```

---

## 3. Component Hierarchy

The application will follow a clean, functional component structure.

### `App` (Root)
- Manages global state (current deck, loading state).
- Layout wrapper (Header, Footer).

### `InputSection`
- **Props**: `onGenerate: (text: string) => Promise<void>`
- **State**: `inputText` (string)
- **UI**: 
  - Textarea for user input.
  - "Generate Flashcards" button (disabled while loading).
  - Validation (e.g., min length).

### `FlashcardGrid`
- **Props**: `deck: { topic: string, flashcards: Flashcard[] }`
- **UI**:
  - Displays the `topic` as a heading.
  - Grid layout of `Flashcard` components.

### `StudyView`
- **Props**: `deck: { topic: string, flashcards: Flashcard[] }`
- **State**: `currentIndex` (number)
- **UI**:
  - Shows one `Flashcard` at a time.
  - "Next" / "Previous" navigation buttons.
  - Progress indicator (e.g., "Card 1 of 10").

### `Flashcard` (Child of FlashcardGrid or StudyView)
- **Props**: `front: string`, `back: string`
- **State**: `isFlipped` (boolean)
- **UI**:
  - Card container with click-to-flip animation.
  - Front face: Question text.
  - Back face: Answer text.
