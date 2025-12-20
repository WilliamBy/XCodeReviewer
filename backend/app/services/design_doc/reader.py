"""
Design document reader service

Supports reading and basic parsing of design documents in various formats.
"""

import os
import logging
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


async def load_design_document(
    project_root: str,
    doc_path: str,
    llm_service=None,
    use_llm_parsing: bool = True,
) -> Optional[Dict[str, Any]]:
    """
    Load and parse design document
    
    Args:
        project_root: Project root directory
        doc_path: Design document path (relative to project_root or absolute)
    
    Returns:
        Dictionary containing parsed document information, or None if failed
    """
    try:
        # Resolve document path
        if os.path.isabs(doc_path):
            full_path = doc_path
        else:
            full_path = os.path.join(project_root, doc_path)
        
        # Normalize path
        full_path = os.path.normpath(full_path)
        
        # Check if file exists
        if not os.path.exists(full_path):
            logger.warning(f"Design document not found: {full_path}")
            return None
        
        if not os.path.isfile(full_path):
            logger.warning(f"Design document path is not a file: {full_path}")
            return None
        
        # Read file content based on extension
        file_ext = os.path.splitext(full_path)[1].lower()
        
        if file_ext in ['.md', '.markdown', '.txt']:
            # Read text-based files
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Try LLM-enhanced parsing if available
            if use_llm_parsing and llm_service:
                try:
                    from .llm_parser import parse_with_llm
                    parsed_info = await parse_with_llm(content, llm_service)
                    logger.info(f"✅ Used LLM-enhanced parsing for design document")
                except Exception as e:
                    logger.warning(f"LLM parsing failed, falling back to basic parsing: {e}")
                    parsed_info = _parse_text_document(content, file_ext)
            else:
                # Basic parsing for Markdown and text files
                parsed_info = _parse_text_document(content, file_ext)
            
            parsed_info['file_path'] = doc_path
            parsed_info['file_size'] = len(content)
            parsed_info['parsing_method'] = 'llm' if (use_llm_parsing and llm_service) else 'basic'
            
            return parsed_info
        
        else:
            # Unsupported format
            logger.warning(f"Unsupported design document format: {file_ext}")
            return {
                'file_path': doc_path,
                'error': f'Unsupported file format: {file_ext}',
                'supported_formats': ['.md', '.markdown', '.txt']
            }
    
    except Exception as e:
        logger.error(f"Failed to load design document: {e}", exc_info=True)
        return {
            'file_path': doc_path,
            'error': str(e)
        }


def _parse_text_document(content: str, file_ext: str) -> Dict[str, Any]:
    """
    Parse text-based design document
    
    Args:
        content: Document content
        file_ext: File extension
    
    Returns:
        Parsed document information
    """
    result = {
        'summary': '',
        'functions': [],
        'interfaces': [],
        'constraints': [],
        'business_rules': [],
        'raw_content': content[:5000],  # Store first 5000 chars for reference
    }
    
    # For Markdown files, extract sections
    if file_ext in ['.md', '.markdown']:
        result.update(_parse_markdown(content))
    else:
        # For plain text, create a simple summary
        lines = content.split('\n')
        result['summary'] = '\n'.join(lines[:20])  # First 20 lines as summary
    
    return result


def _parse_markdown(content: str) -> Dict[str, Any]:
    """
    Basic Markdown parsing - extract sections and key information
    
    Args:
        content: Markdown content
    
    Returns:
        Extracted information
    """
    lines = content.split('\n')
    
    result = {
        'summary': '',
        'functions': [],
        'interfaces': [],
        'constraints': [],
        'business_rules': [],
    }
    
    current_section = None
    current_content = []
    
    for line in lines:
        # Detect section headers
        if line.startswith('#'):
            # Save previous section
            if current_section and current_content:
                _process_section(current_section, '\n'.join(current_content), result)
            
            # Start new section
            current_section = line.strip('#').strip()
            current_content = []
        else:
            if current_section:
                current_content.append(line)
            else:
                # Content before first section (summary)
                result['summary'] += line + '\n'
    
    # Process last section
    if current_section and current_content:
        _process_section(current_section, '\n'.join(current_content), result)
    
    # Limit summary length
    if len(result['summary']) > 1000:
        result['summary'] = result['summary'][:1000] + '...'
    
    return result


def _process_section(section_title: str, content: str, result: Dict[str, Any]) -> None:
    """
    Process a section and extract relevant information
    
    Args:
        section_title: Section title
        content: Section content
        result: Result dictionary to update
    """
    section_lower = section_title.lower()
    
    # Extract functions
    if any(keyword in section_lower for keyword in ['功能', 'function', 'feature', '模块', 'module']):
        # Try to extract function definitions
        functions = _extract_functions(content)
        result['functions'].extend(functions)
    
    # Extract interfaces/APIs
    if any(keyword in section_lower for keyword in ['接口', 'api', 'endpoint', '路由', 'route']):
        interfaces = _extract_interfaces(content)
        result['interfaces'].extend(interfaces)
    
    # Extract constraints
    if any(keyword in section_lower for keyword in ['约束', 'constraint', '要求', 'requirement', '限制', 'limit']):
        constraints = _extract_constraints(content)
        result['constraints'].extend(constraints)
    
    # Extract business rules
    if any(keyword in section_lower for keyword in ['规则', 'rule', '业务', 'business', '逻辑', 'logic']):
        rules = _extract_business_rules(content)
        result['business_rules'].extend(rules)


def _extract_functions(content: str) -> list:
    """Extract function definitions from content"""
    functions = []
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Look for function-like patterns
        if any(keyword in line for keyword in ['功能', 'function', 'feature']):
            functions.append({
                'name': line[:100],
                'description': line
            })
    
    return functions[:20]  # Limit to 20 functions


def _extract_interfaces(content: str) -> list:
    """Extract interface/API definitions from content"""
    interfaces = []
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Look for API-like patterns (GET, POST, PUT, DELETE, /api/, etc.)
        if any(keyword in line.upper() for keyword in ['GET', 'POST', 'PUT', 'DELETE', '/API/', 'ENDPOINT']):
            interfaces.append({
                'description': line[:200]
            })
    
    return interfaces[:20]  # Limit to 20 interfaces


def _extract_constraints(content: str) -> list:
    """Extract constraints from content"""
    constraints = []
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        if line and (line.startswith('-') or line.startswith('*') or line.startswith('1.')):
            constraints.append({
                'description': line[:200]
            })
    
    return constraints[:20]  # Limit to 20 constraints


def _extract_business_rules(content: str) -> list:
    """Extract business rules from content"""
    rules = []
    lines = content.split('\n')
    
    for line in lines:
        line = line.strip()
        if line and (line.startswith('-') or line.startswith('*') or line.startswith('1.')):
            rules.append({
                'rule': line[:200]
            })
    
    return rules[:20]  # Limit to 20 rules
