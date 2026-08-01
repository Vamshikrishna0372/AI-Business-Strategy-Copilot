"""Prompt Engine for rendering structured system and user prompts."""

import logging
from typing import Dict, Optional, Tuple
from app.ai.prompts.templates import MODULE_PROMPTS, SYSTEM_COPILOT_ROLE

logger = logging.getLogger(__name__)


class PromptEngine:
    """Central prompt rendering engine for AI modules."""

    def __init__(self, templates: Optional[Dict[str, str]] = None):
        self.templates = templates or MODULE_PROMPTS
        self.system_role = SYSTEM_COPILOT_ROLE

    def get_template(self, module: str) -> str:
        """Retrieves module prompt template, falling back to general if not found."""
        module_key = module.lower() if module else "general"
        if module_key not in self.templates:
            logger.warning(f"[PromptEngine] Template for module '{module}' not found. Using 'general'.")
            module_key = "general"
        return self.templates[module_key]

    def render_prompt(
        self,
        module: str,
        context: str,
        query: str,
        additional_vars: Optional[Dict[str, str]] = None,
    ) -> Tuple[str, str]:
        """Renders system role prompt and formatted module user prompt."""
        template = self.get_template(module)
        
        format_kwargs = {
            "context": context if context else "No historical startup context available.",
            "query": query if query else "Provide general strategic copilot analysis.",
        }

        if additional_vars:
            format_kwargs.update(additional_vars)

        user_prompt = template.format(**format_kwargs)
        return self.system_role, user_prompt
