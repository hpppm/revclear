import { Router } from "express";
import { authMiddleware } from "../../../middleware/auth";
import { speechToSoap } from "../../../../genkit";

const router = Router();

router.post("/speech-to-soap", authMiddleware, async (req, res) => {
  const { encounter_id, transcript } = req.body || {};

  if (!encounter_id) {
    return res.status(400).json({
      success: false,
      error: "encounter_id is required",
    });
  }

  try {
    // Run the Genkit flow; transcript is optional and will fall back to mock data.
    const result = await speechToSoap({
      encounter_id,
      transcript,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Genkit speechToSoap error:", error);
    res.status(500).json({
      success: false,
      error: error?.message || "Failed to run speechToSoap flow",
    });
  }
});

export default router;
