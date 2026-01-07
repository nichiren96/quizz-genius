import React, { useState, useEffect } from 'react';
import Flashcard from './components/Flashcard';
import MasonryGrid from './components/MasonryGrid';
import InputSection from './components/InputSection';
import { generateFlashcards } from './services/geminiService';
import { supabase } from './lib/supabaseClient';

function App() {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New State for Navigation & Study Mode
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' | 'grid' | 'study'
  const [currentDeck, setCurrentDeck] = useState(null);
  const [studyIndex, setStudyIndex] = useState(0);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 1. Fetch all decks, newest first
      const { data: allDecks, error: decksError } = await supabase
        .from('decks')
        .select('*')
        .order('created_at', { ascending: false });

      if (decksError) throw decksError;

      if (!allDecks || allDecks.length === 0) {
        setDecks([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch all flashcards
      const { data: allCards, error: cardsError } = await supabase
        .from('flashcards')
        .select('*');

      if (cardsError) throw cardsError;

      // 3. Group cards by deck
      const decksWithCards = allDecks.map(deck => ({
        ...deck,
        flashcards: allCards ? allCards.filter(card => card.deck_id === deck.id) : []
      }));

      setDecks(decksWithCards);

      // If we are viewing a deck, update its data in place
      if (currentDeck) {
        const updatedCurrent = decksWithCards.find(d => d.id === currentDeck.id);
        if (updatedCurrent) setCurrentDeck(updatedCurrent);
      }

    } catch (error) {
      console.error('Error fetching data:', error.message);
      alert('Error loading decks: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateFlashcards = async (text, title) => {
    setIsLoading(true);
    try {
      const data = await generateFlashcards(text);
      
      if (data && data.flashcards) {
        try {
          // 1. Create a new deck
          const { data: deckData, error: deckError } = await supabase
            .from('decks')
            .insert([{ 
                topic: title || data.topic || 'Untitled Deck', 
                original_text: text 
            }])
            .select()
            .single();

          if (deckError) throw deckError;

          const deckId = deckData.id;

          // 2. Insert flashcards linked to the deck
          const cardsToInsert = data.flashcards.map(card => ({
            deck_id: deckId,
            front: card.front,
            back: card.back,
            difficulty: card.difficulty || 'Medium'
          }));

          const { error: cardsError } = await supabase
            .from('flashcards')
            .insert(cardsToInsert);

          if (cardsError) throw cardsError;

          await fetchData();

        } catch (dbError) {
          console.error("Failed to save to Supabase:", dbError.message);
          alert("Generated flashcards but failed to save them: " + dbError.message);
        }

      } else {
        console.error("Invalid data structure:", data);
        alert("Received invalid data from AI.");
      }
    } catch (error) {
      console.error("Failed to generate flashcards:", error);
      alert(`Failed to generate flashcards: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdateDifficulty = async (cardId, difficulty) => {
      // Optimistic update
      const updatedDeck = { ...currentDeck };
      const cardIndex = updatedDeck.flashcards.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;

      updatedDeck.flashcards[cardIndex].difficulty = difficulty;
      setCurrentDeck(updatedDeck);

      // Persist to DB
      const { error } = await supabase
        .from('flashcards')
        .update({ difficulty })
        .eq('id', cardId);
      
      if (error) {
          console.error("Error updating difficulty:", error);
          // Revert if needed, or just let next fetch fix it
      } else {
        // Update the main decks list too so stats are correct when going back
        const deckIndex = decks.findIndex(d => d.id === currentDeck.id);
        if (deckIndex !== -1) {
            const newDecks = [...decks];
            newDecks[deckIndex] = updatedDeck;
            setDecks(newDecks);
        }
      }
  };

  const handleDeckSelect = (deck) => {
      setCurrentDeck(deck);
      setViewMode('grid');
  };

  // --- Render Helpers ---

  const renderDashboard = () => (
    <>
      <InputSection onGenerate={handleGenerateFlashcards} isLoading={isLoading} />
      
      {isLoading ? (
         <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <span className="ml-3 text-slate-600">Loading...</span>
         </div>
      ) : decks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map(deck => {
            const totalCards = deck.flashcards.length;
            const masteredCount = deck.flashcards.filter(c => c.difficulty === 'Easy').length;
            const progress = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

            return (
              <div 
                key={deck.id} 
                onClick={() => handleDeckSelect(deck)}
                className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all border border-slate-100"
              >
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-slate-800 line-clamp-1">{deck.topic}</h3>
                    <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                        {totalCards} Cards
                    </span>
                </div>
                
                <div className="mb-2">
                    <div className="flex justify-between text-sm text-slate-500 mb-1">
                        <span>Mastery</span>
                        <span>{masteredCount}/{totalCards}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-4">
                    Created {new Date(deck.created_at).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-slate-400 py-12">
          <p>No decks found. Enter some text above to get started!</p>
        </div>
      )}
    </>
  );

  const renderGridView = () => (
    <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => { setViewMode('dashboard'); setCurrentDeck(null); }}
                    className="text-slate-500 hover:text-indigo-600 font-semibold flex items-center gap-2 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Dashboard
                </button>
            </div>
            
            <h2 className="text-3xl font-bold text-slate-800">{currentDeck?.topic}</h2>

            <button
                onClick={() => { setViewMode('study'); setStudyIndex(0); }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold shadow-md hover:shadow-lg transition-all"
            >
                Start Studying
            </button>
        </div>

        <MasonryGrid>
            {currentDeck?.flashcards.map((card, index) => (
                <Flashcard key={card.id || index} front={card.front} back={card.back} />
            ))}
        </MasonryGrid>
    </div>
  );

  const renderStudyView = () => {
      const card = currentDeck?.flashcards[studyIndex];
      const total = currentDeck?.flashcards.length || 0;

      if (!card) return <div>Error: No card found.</div>;

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-4xl mx-auto">
            <div className="w-full flex justify-between items-center mb-6">
                <button 
                     onClick={() => setViewMode('grid')}
                     className="text-slate-500 hover:text-slate-800 font-semibold"
                >
                    Exit Study
                </button>
                <div className="text-slate-400 font-medium">
                    Card {studyIndex + 1} of {total}
                </div>
            </div>

            {/* Re-using Flashcard but making it bigger/centered if needed. 
                Ideally interacting with it directly. 
                For now we just render it. 
            */}
            <div className="mb-8 w-full max-w-2xl perspective-1000">
                <Flashcard front={card.front} back={card.back} />
            </div>

            <div className="flex flex-col items-center gap-6 w-full">
                {/* Navigation */}
                <div className="flex gap-4">
                    <button 
                        onClick={() => setStudyIndex(Math.max(0, studyIndex - 1))}
                        disabled={studyIndex === 0}
                        className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                    >
                        Previous
                    </button>
                    <button 
                         onClick={() => setStudyIndex(Math.min(total - 1, studyIndex + 1))}
                         disabled={studyIndex === total - 1}
                         className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 disabled:opacity-50 hover:bg-slate-50 transition-colors"
                    >
                        Next
                    </button>
                </div>

                {/* Difficulty Rating */}
                <div className="flex gap-4">
                    <button
                        onClick={() => handleUpdateDifficulty(card.id, 'Easy')}
                        className={`px-6 py-3 rounded-xl font-bold text-white shadow-md transition-transform active:scale-95 ${card.difficulty === 'Easy' ? 'bg-green-600 ring-2 ring-green-300' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                        Easy
                    </button>
                    <button
                        onClick={() => handleUpdateDifficulty(card.id, 'Medium')}
                        className={`px-6 py-3 rounded-xl font-bold text-white shadow-md transition-transform active:scale-95 ${card.difficulty === 'Medium' ? 'bg-blue-600 ring-2 ring-blue-300' : 'bg-blue-500 hover:bg-blue-600'}`}
                    >
                        Medium
                    </button>
                    <button
                        onClick={() => handleUpdateDifficulty(card.id, 'Hard')}
                        className={`px-6 py-3 rounded-xl font-bold text-white shadow-md transition-transform active:scale-95 ${card.difficulty === 'Hard' ? 'bg-orange-600 ring-2 ring-orange-300' : 'bg-orange-500 hover:bg-orange-600'}`}
                    >
                        Hard
                    </button>
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans">
      <header className="mb-8">
        <h1 
            className="text-4xl font-bold text-center text-slate-800 mb-2 cursor-pointer"
            onClick={() => setViewMode('dashboard')}
        >
            QuizGenius
        </h1>
        {viewMode === 'dashboard' && (
             <p className="text-center text-slate-500">Turn any text into study flashcards instantly</p>
        )}
      </header>
      
      <main className="container mx-auto">
        {viewMode === 'dashboard' && renderDashboard()}
        {viewMode === 'grid' && renderGridView()}
        {viewMode === 'study' && renderStudyView()}
      </main>
    </div>
  );
}

export default App;
