"""AI Response Validator and Intelligent JSON Repair Engine."""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class AIResponseValidator:
    """Validates and repairs AI structured JSON responses to guarantee contract compliance."""

    @staticmethod
    def extract_and_clean_json_str(raw_str: str) -> str:
        """Extracts JSON string from markdown code blocks or surrounding text."""
        cleaned = raw_str.strip()
        
        # Strip markdown ```json ... ``` fences if present
        json_fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
        if json_fence_match:
            cleaned = json_fence_match.group(1).strip()
            
        # Extract content between first { and last }
        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            cleaned = cleaned[start_idx : end_idx + 1]

        # Repair common JSON syntax errors (trailing commas)
        cleaned = re.sub(r",\s*([}\]])", r"\1", cleaned)
        return cleaned

    @classmethod
    def parse_and_repair_json(cls, raw_input: Any) -> Dict[str, Any]:
        """Parses raw text or dictionary into a clean JSON dictionary with auto-repair."""
        if isinstance(raw_input, dict):
            return cls.standardize_response_structure(raw_input)

        if not isinstance(raw_input, str) or not raw_input.strip():
            logger.warning("[AI Response Validator] Received empty response string")
            return cls.build_fallback_error_response("AI returned empty response")

        cleaned_str = cls.extract_and_clean_json_str(raw_input)
        try:
            parsed_dict = json.loads(cleaned_str)
            if isinstance(parsed_dict, dict):
                return cls.standardize_response_structure(parsed_dict)
            else:
                return cls.standardize_response_structure({"data": parsed_dict})
        except json.JSONDecodeError as exc:
            logger.warning(f"[AI Response Repair Failed]: {exc} | Raw text sample: {raw_input[:200]}")
            return cls.build_fallback_error_response("AI response could not be parsed into valid JSON structure")

    @classmethod
    def standardize_response_structure(cls, data_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Enforces standard JSON structure: success, message, data, confidence, suggestions, metadata."""
        success = bool(data_dict.get("success", True))
        message = str(data_dict.get("message", "AI operation completed successfully"))
        confidence = float(data_dict.get("confidence", 0.95))
        
        raw_suggestions = data_dict.get("suggestions")
        if isinstance(raw_suggestions, list):
            suggestions = [str(s) for s in raw_suggestions]
        else:
            suggestions = ["Review AI generated strategy", "Update startup profile details if needed"]

        raw_metadata = data_dict.get("metadata")
        metadata = raw_metadata if isinstance(raw_metadata, dict) else {}

        # Extract payload data
        if "data" in data_dict:
            payload_data = data_dict["data"]
        else:
            # Move non-standard fields inside data dict
            reserved_keys = {"success", "message", "confidence", "suggestions", "metadata"}
            payload_data = {k: v for k, v in data_dict.items() if k not in reserved_keys}
            if not payload_data:
                payload_data = {"summary": message}

        return {
            "success": success,
            "message": message,
            "data": payload_data,
            "confidence": confidence,
            "suggestions": suggestions,
            "metadata": metadata,
        }

    @classmethod
    def validate_schema(
        cls, response_dict: Dict[str, Any], required_fields: List[str]
    ) -> Tuple[bool, Optional[str]]:
        """Checks whether response dict contains all required nested or root fields."""
        data = response_dict.get("data", {})
        missing = []
        for field in required_fields:
            if field not in response_dict and (isinstance(data, dict) and field not in data):
                missing.append(field)
        if missing:
            return False, f"Missing required response fields: {', '.join(missing)}"
        return True, None

    @classmethod
    def build_fallback_error_response(cls, error_msg: str) -> Dict[str, Any]:
        """Constructs a clean, valid standard error payload."""
        return {
            "success": False,
            "message": error_msg,
            "data": {"error": error_msg},
            "confidence": 0.0,
            "suggestions": ["Retry request", "Check AI service status"],
            "metadata": {"error_type": "validation_failure"},
        }
