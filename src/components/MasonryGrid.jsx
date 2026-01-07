import React from 'react';

const MasonryGrid = ({ children }) => {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 p-4">
      {React.Children.map(children, (child) => (
        <div className="break-inside-avoid">
          {child}
        </div>
      ))}
    </div>
  );
};

export default MasonryGrid;
