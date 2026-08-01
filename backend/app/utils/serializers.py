"""MongoDB / BSON data serialization helpers."""

from typing import Any, Dict, List
from bson import ObjectId


def bson_to_dict(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Converts MongoDB BSON document dict to JSON serializable dict."""
    if not doc:
        return {}
    res = dict(doc)
    if "_id" in res:
        res["id"] = str(res.pop("_id"))
    for k, v in res.items():
        if isinstance(v, ObjectId):
            res[k] = str(v)
    return res


def bson_list_to_dict_list(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Converts list of BSON documents to list of JSON serializable dicts."""
    return [bson_to_dict(doc) for doc in docs]
