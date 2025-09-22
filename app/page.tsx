//app/page.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [formType, setFormType] = useState<'workout' | 'diet'>('workout');
  const [input, setInput] = useState({
    height: '',
    weight: '',
    gender: '',
    age: '',
    goal: '',
    healthConditions: '',
    workoutDaysPerWeek: '',
    dietType: '',
    allergies: '',
    mealFrequency: '',
    caloricPreference: '',
    foodRestrictions: '',
  });
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const url = formType === 'workout' ? '/api/generate/workout' : '/api/generate/diet';
      const { data } = await axios.post(url, input);
      setOutput(data.workoutPlan || data.dietPlan);
    } catch (error) {
      console.error('Error:', error);
      setOutput('An error occurred. This may be due to the app being hosted on Vercel’s free (hobby) tier and using Gemini 1.5-Flash, which occasionally exceeds the 10-second execution limit, causing a timeout.');

    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl py-6 px-4">
      <div className="grid gap-6 md:grid-cols-[1.1fr_1fr]">
        {/* Left: Input Form */}
        <Card className="p-6 border-primary/20">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">Generate your plan</h1>
            <Tabs defaultValue="workout" onValueChange={(val) => setFormType(val as 'workout' | 'diet')}>
              <TabsList>
                <TabsTrigger value="workout">Workout</TabsTrigger>
                <TabsTrigger value="diet">Diet</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="Height (cm)" onChange={(e) => setInput({ ...input, height: e.target.value })} />
            <Input placeholder="Weight (kg)" onChange={(e) => setInput({ ...input, weight: e.target.value })} />
            <Input placeholder="Gender" onChange={(e) => setInput({ ...input, gender: e.target.value })} />
            <Input placeholder="Age" onChange={(e) => setInput({ ...input, age: e.target.value })} />
            <Input placeholder="Goal (e.g. fat loss, muscle gain)" onChange={(e) => setInput({ ...input, goal: e.target.value })} />
            <Input placeholder="Health Conditions (optional)" onChange={(e) => setInput({ ...input, healthConditions: e.target.value })} />
            <Input placeholder="Diet Type (e.g. veg, keto)" onChange={(e) => setInput({ ...input, dietType: e.target.value })} />
            {formType === 'workout' && (
              <Input placeholder="Workout Days per Week" onChange={(e) => setInput({ ...input, workoutDaysPerWeek: e.target.value })} />
            )}
            {formType === 'diet' && (
              <>
                <Input placeholder="Allergies" onChange={(e) => setInput({ ...input, allergies: e.target.value })} />
                <Input placeholder="Food Restrictions" onChange={(e) => setInput({ ...input, foodRestrictions: e.target.value })} />
                <Input placeholder="Meal Frequency" onChange={(e) => setInput({ ...input, mealFrequency: e.target.value })} />
                <Input placeholder="Caloric Preference" onChange={(e) => setInput({ ...input, caloricPreference: e.target.value })} />
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button onClick={handleSubmit} disabled={loading} className="col-span-2">
              {loading ? 'Generating…' : 'Generate Plan'}
            </Button>
            <Button variant="outline" onClick={() => { setOutput(''); setInput({ height: '', weight: '', gender: '', age: '', goal: '', healthConditions: '', workoutDaysPerWeek: '', dietType: '', allergies: '', mealFrequency: '', caloricPreference: '', foodRestrictions: '' }); }}>Clear</Button>
          </div>
        </Card>

        {/* Right: Output Panel */}
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div className="font-semibold">Output</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                if (!output) return; navigator.clipboard.writeText(output);
              }}>Copy</Button>
            </div>
          </div>

          <div className="p-6">
            {!output ? (
              <div className="text-sm text-muted-foreground">Your AI-generated plan will appear here.</div>
            ) : (
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <ReactMarkdown>{output}</ReactMarkdown>
              </div>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
