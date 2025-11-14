import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { BookPlus, Plus, X, BookOpen, FileQuestion } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Question {
  text: string;
  options: string[];
  correct_index: number;
  difficulty: string;
}

export default function Contribute() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Book content state
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [subjects, setSubjects] = useState("");
  const [characters, setCharacters] = useState<Array<{ name: string; description: string }>>([
    { name: "", description: "" }
  ]);
  
  // Quiz questions state
  const [quizBookId, setQuizBookId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([
    { text: "", options: ["", "", ""], correct_index: 0, difficulty: "medium" }
  ]);
  
  // New book state
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    cover_url: "",
    age_min: 5,
    age_max: 10
  });

  // Fetch books for selection
  const { data: books } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author")
        .order("title");
      
      if (error) throw error;
      return data;
    }
  });

  const handleSubmitContent = async () => {
    if (!selectedBookId || !description || description.length < 100) {
      toast({
        title: "Invalid Input",
        description: "Please select a book and provide at least 100 characters of description.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("book_content").insert({
        book_id: selectedBookId,
        submitted_by: user.id,
        description,
        subjects: subjects ? subjects.split(",").map(s => s.trim()) : [],
        key_characters: characters.filter(c => c.name)
      });

      if (error) throw error;

      // Track contribution
      await supabase.from("user_contributions").insert({
        user_id: user.id,
        contribution_type: "book_content",
        status: "pending"
      });

      toast({
        title: "Content Submitted!",
        description: "Your book content has been submitted for review. Thank you!"
      });

      // Reset form
      setSelectedBookId("");
      setDescription("");
      setSubjects("");
      setCharacters([{ name: "", description: "" }]);
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubmitQuestions = async () => {
    if (!quizBookId || questions.length === 0 || questions.length > 10) {
      toast({
        title: "Invalid Input",
        description: "Please select a book and create 1-10 questions.",
        variant: "destructive"
      });
      return;
    }

    // Validate all questions
    for (const q of questions) {
      if (!q.text || q.options.some(opt => !opt)) {
        toast({
          title: "Incomplete Questions",
          description: "Please fill in all question fields and options.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Add "None of the above" to each question
      const questionsWithNone = questions.map(q => ({
        ...q,
        options: [...q.options, "None of the above"]
      }));

      const { error } = await supabase.from("user_quiz_questions").insert(
        questionsWithNone.map(q => ({
          book_id: quizBookId,
          created_by: user.id,
          question_text: q.text,
          options: q.options,
          correct_index: q.correct_index,
          difficulty: q.difficulty
        }))
      );

      if (error) throw error;

      // Track contribution
      await supabase.from("user_contributions").insert({
        user_id: user.id,
        contribution_type: "quiz_question",
        status: "pending"
      });

      toast({
        title: "Questions Submitted!",
        description: `${questions.length} question(s) submitted for review. Thank you!`
      });

      // Reset form
      setQuizBookId("");
      setQuestions([{ text: "", options: ["", "", ""], correct_index: 0, difficulty: "medium" }]);
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSubmitBook = async () => {
    if (!newBook.title) {
      toast({
        title: "Invalid Input",
        description: "Please provide at least a book title.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("user_books").insert({
        ...newBook,
        added_by: user.id
      });

      if (error) throw error;

      // Track contribution
      await supabase.from("user_contributions").insert({
        user_id: user.id,
        contribution_type: "book_added",
        status: "pending"
      });

      toast({
        title: "Book Submitted!",
        description: "Your book has been submitted for review. Thank you!"
      });

      // Reset form
      setNewBook({
        title: "",
        author: "",
        cover_url: "",
        age_min: 5,
        age_max: 10
      });
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addCharacter = () => {
    setCharacters([...characters, { name: "", description: "" }]);
  };

  const removeCharacter = (index: number) => {
    setCharacters(characters.filter((_, i) => i !== index));
  };

  const addQuestion = () => {
    if (questions.length < 10) {
      setQuestions([...questions, { text: "", options: ["", "", ""], correct_index: 0, difficulty: "medium" }]);
    }
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-quiz-purple via-quiz-blue to-quiz-pink p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 text-white"
        >
          ← Back to Home
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl">Contribute to Quiz Quality</CardTitle>
            <CardDescription>
              Help make quizzes better by adding book content, creating questions, or suggesting new books
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">
              <BookOpen className="h-4 w-4 mr-2" />
              Book Content
            </TabsTrigger>
            <TabsTrigger value="questions">
              <FileQuestion className="h-4 w-4 mr-2" />
              Quiz Questions
            </TabsTrigger>
            <TabsTrigger value="book">
              <BookPlus className="h-4 w-4 mr-2" />
              Add Book
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card>
              <CardHeader>
                <CardTitle>Add Book Content</CardTitle>
                <CardDescription>
                  Help improve quiz quality by adding plot summaries and descriptions (minimum 100 words)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Book</Label>
                  <Select value={selectedBookId} onValueChange={setSelectedBookId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a book" />
                    </SelectTrigger>
                    <SelectContent>
                      {books?.map(book => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.title} {book.author ? `by ${book.author}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Plot Summary</Label>
                  <Textarea
                    placeholder="Write a detailed plot summary mentioning main characters, key events, and how the story ends (minimum 100 words)..."
                    rows={8}
                    maxLength={2000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {description.length} / 2000 characters (minimum 100)
                  </p>
                </div>

                <div>
                  <Label>Subjects/Themes (comma separated)</Label>
                  <Input
                    placeholder="Adventure, Friendship, Problem Solving"
                    value={subjects}
                    onChange={(e) => setSubjects(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Main Characters (optional)</Label>
                  {characters.map((char, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="Character name"
                        value={char.name}
                        onChange={(e) => {
                          const newChars = [...characters];
                          newChars[i].name = e.target.value;
                          setCharacters(newChars);
                        }}
                      />
                      <Input
                        placeholder="Description"
                        value={char.description}
                        onChange={(e) => {
                          const newChars = [...characters];
                          newChars[i].description = e.target.value;
                          setCharacters(newChars);
                        }}
                      />
                      {characters.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeCharacter(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addCharacter}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Character
                  </Button>
                </div>

                <Button size="lg" className="w-full" onClick={handleSubmitContent}>
                  Submit for Review
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions">
            <Card>
              <CardHeader>
                <CardTitle>Create Quiz Questions</CardTitle>
                <CardDescription>
                  Maximum 10 questions per submission. Each question needs 3 answers + "None of the above" (added automatically)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Select Book</Label>
                  <Select value={quizBookId} onValueChange={setQuizBookId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a book" />
                    </SelectTrigger>
                    <SelectContent>
                      {books?.map(book => (
                        <SelectItem key={book.id} value={book.id}>
                          {book.title} {book.author ? `by ${book.author}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {questions.map((q, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <Label>Question {index + 1}</Label>
                        {questions.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeQuestion(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <Input
                        placeholder="What did the character do in the story?"
                        maxLength={200}
                        value={q.text}
                        onChange={(e) => {
                          const newQuestions = [...questions];
                          newQuestions[index].text = e.target.value;
                          setQuestions(newQuestions);
                        }}
                      />

                      <div className="space-y-2">
                        <Label>Answers (3 options)</Label>
                        {[0, 1, 2].map(optIndex => (
                          <Input
                            key={optIndex}
                            placeholder={`Option ${optIndex + 1}`}
                            value={q.options[optIndex]}
                            onChange={(e) => {
                              const newQuestions = [...questions];
                              newQuestions[index].options[optIndex] = e.target.value;
                              setQuestions(newQuestions);
                            }}
                          />
                        ))}
                        <Input
                          placeholder="None of the above"
                          value="None of the above (added automatically)"
                          disabled
                          className="bg-muted"
                        />
                      </div>

                      <div>
                        <Label>Correct Answer</Label>
                        <RadioGroup
                          value={q.correct_index.toString()}
                          onValueChange={(value) => {
                            const newQuestions = [...questions];
                            newQuestions[index].correct_index = parseInt(value);
                            setQuestions(newQuestions);
                          }}
                        >
                          {q.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <RadioGroupItem value={i.toString()} />
                              <Label>{opt || `Option ${i + 1}`}</Label>
                            </div>
                          ))}
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value="3" />
                            <Label>None of the above</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div>
                        <Label>Difficulty</Label>
                        <Select
                          value={q.difficulty}
                          onValueChange={(value) => {
                            const newQuestions = [...questions];
                            newQuestions[index].difficulty = value;
                            setQuestions(newQuestions);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy (5-7 years)</SelectItem>
                            <SelectItem value="medium">Medium (8-10 years)</SelectItem>
                            <SelectItem value="hard">Hard (11-13 years)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}

                {questions.length < 10 && (
                  <Button variant="outline" onClick={addQuestion} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question (max 10)
                  </Button>
                )}

                <Button size="lg" className="w-full" onClick={handleSubmitQuestions}>
                  Submit {questions.length} Question{questions.length !== 1 ? 's' : ''} for Review
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="book">
            <Card>
              <CardHeader>
                <CardTitle>Add a New Book</CardTitle>
                <CardDescription>
                  Can't find a book in our system? Add it here!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Book Title *</Label>
                  <Input
                    placeholder="Enter book title"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Author Name</Label>
                  <Input
                    placeholder="Author name (optional)"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Cover Image URL</Label>
                  <Input
                    placeholder="https://example.com/cover.jpg (optional)"
                    value={newBook.cover_url}
                    onChange={(e) => setNewBook({ ...newBook, cover_url: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Minimum Age</Label>
                    <Input
                      type="number"
                      min="3"
                      max="18"
                      value={newBook.age_min}
                      onChange={(e) => setNewBook({ ...newBook, age_min: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Maximum Age</Label>
                    <Input
                      type="number"
                      min="3"
                      max="18"
                      value={newBook.age_max}
                      onChange={(e) => setNewBook({ ...newBook, age_max: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <Button size="lg" className="w-full" onClick={handleSubmitBook}>
                  Submit Book for Review
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
