-- Restore missing popular children's books
-- These books are added as manual entries (open_library_id = NULL) to prevent accidental deletion

-- Julia Donaldson books (missing The Gruffalo series and more)
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('The Gruffalo', 'Julia Donaldson', 3, 7, NULL, 'en'),
('The Gruffalo''s Child', 'Julia Donaldson', 3, 7, NULL, 'en'),
('A Squash and a Squeeze', 'Julia Donaldson', 3, 7, NULL, 'en'),
('The Paper Dolls', 'Julia Donaldson', 4, 8, NULL, 'en'),
('Monkey Puzzle', 'Julia Donaldson', 3, 6, NULL, 'en'),
('The Singing Mermaid', 'Julia Donaldson', 3, 7, NULL, 'en'),
('Tabby McTat', 'Julia Donaldson', 3, 7, NULL, 'en'),
('Tiddler', 'Julia Donaldson', 3, 7, NULL, 'en'),
('Tyrannosaurus Drip', 'Julia Donaldson', 4, 8, NULL, 'en'),
('Cave Baby', 'Julia Donaldson', 3, 7, NULL, 'en')
ON CONFLICT DO NOTHING;

-- Eric Carle books
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('The Very Hungry Caterpillar', 'Eric Carle', 2, 6, NULL, 'en'),
('Brown Bear, Brown Bear, What Do You See?', 'Eric Carle', 2, 5, NULL, 'en'),
('The Very Busy Spider', 'Eric Carle', 2, 6, NULL, 'en'),
('The Very Quiet Cricket', 'Eric Carle', 2, 6, NULL, 'en'),
('Papa, Please Get the Moon for Me', 'Eric Carle', 3, 7, NULL, 'en'),
('The Mixed-Up Chameleon', 'Eric Carle', 3, 7, NULL, 'en'),
('The Grouchy Ladybug', 'Eric Carle', 3, 7, NULL, 'en'),
('From Head to Toe', 'Eric Carle', 2, 5, NULL, 'en')
ON CONFLICT DO NOTHING;

-- Beatrix Potter books
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('The Tale of Peter Rabbit', 'Beatrix Potter', 3, 7, NULL, 'en'),
('The Tale of Squirrel Nutkin', 'Beatrix Potter', 3, 7, NULL, 'en'),
('The Tale of Benjamin Bunny', 'Beatrix Potter', 3, 7, NULL, 'en'),
('The Tale of Mrs. Tiggy-Winkle', 'Beatrix Potter', 3, 7, NULL, 'en'),
('The Tale of Jemima Puddle-Duck', 'Beatrix Potter', 3, 7, NULL, 'en'),
('The Tale of Tom Kitten', 'Beatrix Potter', 3, 7, NULL, 'en')
ON CONFLICT DO NOTHING;

-- Dr. Seuss books (adding more classics)
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('One Fish Two Fish Red Fish Blue Fish', 'Dr. Seuss', 4, 8, NULL, 'en'),
('Oh, the Places You''ll Go!', 'Dr. Seuss', 5, 10, NULL, 'en'),
('Hop on Pop', 'Dr. Seuss', 3, 7, NULL, 'en'),
('Fox in Socks', 'Dr. Seuss', 4, 8, NULL, 'en'),
('The Lorax', 'Dr. Seuss', 5, 10, NULL, 'en'),
('Horton Hears a Who!', 'Dr. Seuss', 4, 8, NULL, 'en'),
('How the Grinch Stole Christmas!', 'Dr. Seuss', 5, 10, NULL, 'en')
ON CONFLICT DO NOTHING;

-- Margaret Wise Brown books
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('Goodnight Moon', 'Margaret Wise Brown', 1, 5, NULL, 'en'),
('The Runaway Bunny', 'Margaret Wise Brown', 2, 6, NULL, 'en')
ON CONFLICT DO NOTHING;

-- Mo Willems books
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('Don''t Let the Pigeon Drive the Bus!', 'Mo Willems', 3, 7, NULL, 'en'),
('Knuffle Bunny', 'Mo Willems', 3, 7, NULL, 'en'),
('Elephant and Piggie: Are You Ready to Play Outside?', 'Mo Willems', 4, 8, NULL, 'en')
ON CONFLICT DO NOTHING;

-- Sandra Boynton books
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('Moo, Baa, La La La!', 'Sandra Boynton', 1, 4, NULL, 'en'),
('The Going to Bed Book', 'Sandra Boynton', 1, 4, NULL, 'en'),
('Barnyard Dance!', 'Sandra Boynton', 1, 4, NULL, 'en')
ON CONFLICT DO NOTHING;

-- Bill Martin Jr. & Eric Carle collaboration
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('Brown Bear, Brown Bear, What Do You See?', 'Bill Martin Jr.', 2, 5, NULL, 'en'),
('Polar Bear, Polar Bear, What Do You Hear?', 'Bill Martin Jr.', 2, 5, NULL, 'en')
ON CONFLICT DO NOTHING;

-- Laura Numeroff books
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('If You Give a Mouse a Cookie', 'Laura Numeroff', 4, 8, NULL, 'en'),
('If You Give a Moose a Muffin', 'Laura Numeroff', 4, 8, NULL, 'en')
ON CONFLICT DO NOTHING;

-- Anna Dewdney books
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('Llama Llama Red Pajama', 'Anna Dewdney', 2, 6, NULL, 'en'),
('Llama Llama Mad at Mama', 'Anna Dewdney', 2, 6, NULL, 'en')
ON CONFLICT DO NOTHING;

-- Other essential children's classics
INSERT INTO books (title, author, age_min, age_max, open_library_id, language) VALUES
('Chicka Chicka Boom Boom', 'Bill Martin Jr.', 3, 7, NULL, 'en'),
('Corduroy', 'Don Freeman', 3, 7, NULL, 'en'),
('Harold and the Purple Crayon', 'Crockett Johnson', 4, 8, NULL, 'en'),
('Make Way for Ducklings', 'Robert McCloskey', 4, 8, NULL, 'en'),
('Curious George', 'H. A. Rey', 4, 8, NULL, 'en'),
('Madeline', 'Ludwig Bemelmans', 4, 8, NULL, 'en'),
('Guess How Much I Love You', 'Sam McBratney', 2, 6, NULL, 'en'),
('The Snowy Day', 'Ezra Jack Keats', 3, 7, NULL, 'en'),
('Caps for Sale', 'Esphyr Slobodkina', 3, 7, NULL, 'en'),
('Blueberries for Sal', 'Robert McCloskey', 4, 8, NULL, 'en')
ON CONFLICT DO NOTHING;