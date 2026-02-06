"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  console.log("=== createFeedback START ===");
  console.log("Params:", { interviewId, userId, feedbackId, transcriptLength: transcript.length });

  try {
    const formattedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    console.log("Formatted transcript length:", formattedTranscript.length);

    console.log("Calling Gemini AI...");
    const { object } = await generateObject({
      model: google("gemini-2.0-flash-001", {
        structuredOutputs: false,
      }),
      schema: feedbackSchema,
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        Transcript:
        ${formattedTranscript}

        Provide scores and evaluations for EXACTLY these 5 categories in this order:
        1. Communication Skills - Clarity, articulation, structured responses
        2. Technical Knowledge - Understanding of key concepts for the role
        3. Problem Solving - Ability to analyze problems and propose solutions
        4. Cultural Fit - Alignment with company values and job role
        5. Confidence and Clarity - Confidence in responses, engagement, and clarity

        Each category should have:
        - name: The exact category name as shown above
        - score: A number from 0 to 100
        - comment: Detailed feedback for that category

        Also provide:
        - totalScore: Overall score from 0 to 100
        - strengths: Array of candidate's strengths
        - areasForImprovement: Array of areas where they can improve
        - finalAssessment: Overall summary of the interview
        `,
      system:
        "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
    });

    console.log("Gemini AI response received:", object);

    const feedback = {
      interviewId: interviewId,
      userId: userId,
      totalScore: object.totalScore,
      categoryScores: object.categoryScores,
      strengths: object.strengths,
      areasForImprovement: object.areasForImprovement,
      finalAssessment: object.finalAssessment,
      createdAt: new Date().toISOString(),
    };

    console.log("Feedback object created:", feedback);

    let feedbackRef;

    if (feedbackId) {
      console.log("Updating existing feedback:", feedbackId);
      feedbackRef = db.collection("feedback").doc(feedbackId);
    } else {
      console.log("Creating new feedback document");
      feedbackRef = db.collection("feedback").doc();
    }

    console.log("Saving to Firebase with ID:", feedbackRef.id);
    await feedbackRef.set(feedback);

    console.log("=== createFeedback SUCCESS ===");
    console.log("Returning:", { success: true, feedbackId: feedbackRef.id });
    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("=== createFeedback ERROR ===");
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  if (process.env.NODE_ENV === "development") {
    console.log("=== getFeedbackByInterviewId START ===");
    console.log("Query params:", { interviewId, userId });
  }

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (process.env.NODE_ENV === "development") {
    console.log("Query results:", { empty: querySnapshot.empty, size: querySnapshot.size });
  }

  if (querySnapshot.empty) {
    if (process.env.NODE_ENV === "development") {
      console.log("No feedback found");
    }
    return null;
  }

  const feedbackDoc = querySnapshot.docs[0];
  if (process.env.NODE_ENV === "development") {
    console.log("Feedback found:", feedbackDoc.id);
    console.log("=== getFeedbackByInterviewId END ===");
  }
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .orderBy("createdAt", "desc")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}