import React, { useState } from 'react';

const Flashcard = ({ front, back }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="group h-64 w-full [perspective:1000px] cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className={`relative h-full w-full transition-all duration-500 [transform-style:preserve-3d] ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
        {/* Front Face */}
        <div className="absolute inset-0 h-full w-full rounded-xl bg-white p-6 shadow-lg [backface-visibility:hidden] flex items-center justify-center text-center">
            <div className="text-xl font-medium text-slate-800">
                {front}
            </div>
        </div>

        {/* Back Face */}
        <div className="absolute inset-0 h-full w-full rounded-xl bg-indigo-50 p-6 shadow-lg [transform:rotateY(180deg)] [backface-visibility:hidden] flex items-center justify-center text-center">
             <div className="text-lg text-slate-700">
                {back}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
