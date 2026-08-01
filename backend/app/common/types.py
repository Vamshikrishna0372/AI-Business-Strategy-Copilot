"""Custom Type definitions and Type Aliases."""

from typing import Any, Dict, List, TypeVar, Union
from pydantic import GetCoreSchemaHandler
from pydantic_core import CoreSchema, core_schema
from bson import ObjectId

# Type variable for generic repository/schema patterns
T = TypeVar("T")

# JSON Dictionary type alias
JsonDict = Dict[str, Any]


class PyObjectId(str):
    """Custom type for MongoDB ObjectId integration with Pydantic V2."""

    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: GetCoreSchemaHandler
    ) -> CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ]),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, value: Any) -> ObjectId:
        if isinstance(value, ObjectId):
            return value
        if isinstance(value, str) and ObjectId.is_valid(value):
            return ObjectId(value)
        raise ValueError(f"Invalid ObjectId string: {value}")
