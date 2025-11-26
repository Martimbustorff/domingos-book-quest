-- Delete non-children's books and all related data
-- This removes adult content including Shakespeare, Stephen King, Kafka, etc.

-- List of book titles to delete (adult/inappropriate content)
DO $$
DECLARE
  book_titles TEXT[] := ARRAY[
    'Romeo and Juliet',
    'Hamlet',
    'Macbeth',
    'A Midsummer Night''s Dream',
    'The Tempest',
    'Othello',
    'The Shining',
    'It',
    'Carrie',
    'Pet Sematary',
    'The Metamorphosis',
    'The Trial',
    'Faust',
    'The Sorrows of Young Werther',
    'The Kite Runner',
    'A Thousand Splendid Suns',
    'Gigi',
    'The Picture of Dorian Gray',
    'A Town Like Alice',
    'The Importance of Being Earnest',
    'Waiting for Godot',
    'Hair Cutting',
    'Modern Haircutting',
    'The Old Man and the Sea',
    'For Whom the Bell Tolls',
    '1984',
    'Animal Farm',
    'Brave New World',
    'Lord of the Flies',
    'The Catcher in the Rye',
    'To Kill a Mockingbird'
  ];
  book_rec RECORD;
BEGIN
  -- Loop through each title and delete the book and all related data
  FOR book_rec IN 
    SELECT id FROM books WHERE title = ANY(book_titles)
  LOOP
    -- Use the existing delete function
    PERFORM delete_book_and_related(book_rec.id);
    RAISE NOTICE 'Deleted book: %', book_rec.id;
  END LOOP;
END $$;