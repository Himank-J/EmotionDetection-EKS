'use client'

import { useState } from 'react'
import { Upload, Loader2, Github } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
// import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog"

interface Prediction {
  emotion: string
  probability: string
}

// Add emoji mapping
const emotionEmojis: { [key: string]: string } = {
  angry: "😠 ",
  surprise: "😮 ",
  fear: "😨 ",
  happy: "😊 ",
  sad: "😢 ",
  neutral: "😐 ",
  disgust: "🤢 "
};

export default function Home() {
  // Using existing state from lines 24-28
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showResults, setShowResults] = useState(false)

  // Using existing handlers from lines 30-92
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    setSelectedImage(file)
    setPreview(URL.createObjectURL(file))
    setPredictions([])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setError('')
    
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    setSelectedImage(file)
    setPreview(URL.createObjectURL(file))
    setPredictions([])
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const analyzePicture = async () => {
    if (!selectedImage) return
  
    setIsLoading(true)
    setError('')
    setShowResults(false)
  
    const formData = new FormData()
    formData.append('file', selectedImage)
  
    try {
      const response = await fetch('http://127.0.0.1:65115/predict', {
        method: 'POST',
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze image')
      }
  
      const data = await response.json()
      setPredictions(data.predictions)
      setShowResults(true)
    } catch (err) {
      console.error(err)
      setError('Failed to analyze image. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-12">
          <div className="text-primary">
            <span className="font-semibold">Himank Jain</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Himank-J/k8s_helm_model_deployment"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" size="icon">
                <Github className="h-5 w-5" />
              </Button>
            </a>
            <ThemeToggle />
          </div>
        </div>

        {/* Hero Section with gradient text */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent">
            EmotiSense
          </h1>
          <p className="text-2xl mb-3 bg-gradient-to-r from-blue-500 to-teal-500 bg-clip-text text-transparent">
            Decode feelings through faces
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Advanced AI-powered emotion detection for understanding human expressions in real-time
          </p>
        </div>
        
        {/* Dynamic layout wrapper */}
        <div className={`
          max-w-6xl mx-auto
          ${showResults 
            ? 'flex flex-col lg:flex-row gap-8 justify-between' 
            : 'flex justify-center'
          }
        `}>
          {/* Upload section */}
          <div className={`
            ${showResults ? 'w-full lg:w-1/2' : 'w-full max-w-2xl'}
            transition-all duration-300 ease-in-out
          `}>
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Upload Image</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-6">
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center min-h-[400px] w-full flex flex-col items-center justify-center"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                >
                  {preview ? (
                    <div className="relative aspect-square w-full max-w-md mx-auto">
                      <img
                        src={preview}
                        alt="Preview"
                        className="rounded-lg object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('image-upload')?.click()}
                        className="w-full max-w-md"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Image
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        or drag and drop an image here
                      </span>
                    </div>
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>

                {/* Analyze Button */}
                <Button
                  onClick={analyzePicture}
                  disabled={!selectedImage || isLoading}
                  className="w-full max-w-md"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze Image'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results section */}
          {showResults && (
            <div className="w-full lg:w-1/2 transition-all duration-300 ease-in-out">
              <Card className="w-full">
                <CardHeader>
                  <CardTitle className="text-2xl text-center">Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {predictions.length > 0 && (
                    <div className="space-y-6">
                      {/* Primary Prediction */}
                      <Card className="bg-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                          <div className="text-center space-y-2">
                            <h3 className="text-xl font-semibold capitalize flex items-center justify-center gap-2">
                              {emotionEmojis[predictions[0].emotion.toLowerCase()]}
                              {predictions[0].emotion}
                            </h3>
                            <Progress 
                              value={parseFloat(predictions[0].probability) * 100} 
                              className="h-2" 
                            />
                            <p className="text-sm text-muted-foreground">
                              {(parseFloat(predictions[0].probability) * 100).toFixed(1)}% confidence
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Secondary Predictions */}
                      <div className="space-y-4">
                        {predictions.slice(1).map((prediction, index) => (
                          <Card key={index} className="bg-secondary/5">
                            <CardContent className="py-4">
                              <div className="text-center space-y-2">
                                <h4 className="text-sm font-medium capitalize flex items-center justify-center gap-2">
                                  {emotionEmojis[prediction.emotion.toLowerCase()]}
                                  {prediction.emotion}
                                </h4>
                                <Progress 
                                  value={parseFloat(prediction.probability) * 100} 
                                  className="h-2" 
                                />
                                <p className="text-xs text-muted-foreground">
                                  {(parseFloat(prediction.probability) * 100).toFixed(1)}%
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Error Dialog */}
        <AlertDialog open={!!error}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Error</AlertDialogTitle>
              <AlertDialogDescription>{error}</AlertDialogDescription>
            </AlertDialogHeader>
            <Button onClick={() => setError('')}>Close</Button>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}