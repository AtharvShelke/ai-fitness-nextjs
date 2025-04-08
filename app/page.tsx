'use client';

import { useState } from 'react';
import axios from 'axios';
import { Textarea } from '@/components/ui/textarea';
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
      setOutput('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-4xl font-bold mb-6 text-center">AI Fitness & Diet Generator</h1>

      <Tabs defaultValue="workout" onValueChange={(val) => setFormType(val as 'workout' | 'diet')} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="workout">Workout Plan</TabsTrigger>
          <TabsTrigger value="diet">Diet Plan</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Input placeholder="Height (cm)" onChange={(e) => setInput({ ...input, height: e.target.value })} />
        <Input placeholder="Weight (kg)" onChange={(e) => setInput({ ...input, weight: e.target.value })} />
        <Input placeholder="Gender" onChange={(e) => setInput({ ...input, gender: e.target.value })} />
        <Input placeholder="Age" onChange={(e) => setInput({ ...input, age: e.target.value })} />
        <Input placeholder="Goal" onChange={(e) => setInput({ ...input, goal: e.target.value })} />
        <Input placeholder="Health Conditions" onChange={(e) => setInput({ ...input, healthConditions: e.target.value })} />
        <Input placeholder="Diet Type" onChange={(e) => setInput({ ...input, dietType: e.target.value })} />
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

      <Button onClick={handleSubmit} disabled={loading} className="w-full mb-6">
        {loading ? 'Generating...' : 'Generate Plan'}
      </Button>

      {output && (
        <Card className="prose prose-neutral dark:prose-invert max-w-none p-4 border shadow-md overflow-auto">
          <ReactMarkdown>{output}</ReactMarkdown>
        </Card>
      )}
    </main>
  );
}
