#!/usr/bin/env python3
"""
YASA Client - CLI para testar YASA streaming com Responses API
"""
import argparse
import sys
import json
from openai import OpenAI

# ANSI color codes
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    RESET = '\033[0m'

def format_json(data, max_length=500, verbose=False):
    """Format JSON with optional truncation for readability"""
    json_str = json.dumps(data, indent=2, ensure_ascii=False)

    if verbose or len(json_str) <= max_length:
        return json_str

    # Try compact format first
    compact = json.dumps(data, ensure_ascii=False)
    if len(compact) <= 100:
        return compact

    # Truncate and add summary
    size_kb = len(json_str) / 1024

    # Count items if it's a dict with arrays
    summary_parts = []
    if isinstance(data, dict):
        for key, value in data.items():
            if isinstance(value, list):
                summary_parts.append(f"{key}: {len(value)} items")

    summary = ", ".join(summary_parts) if summary_parts else "..."

    truncated = json_str[:max_length]
    last_newline = truncated.rfind('\n')
    if last_newline > 0:
        truncated = truncated[:last_newline]

    return f"{truncated}\n  ... ({summary}) [{size_kb:.1f} KB total - use --verbose to see all]"


def main():
    parser = argparse.ArgumentParser(description='YASA Client - Test streaming with Responses API')
    parser.add_argument('-m', '--model', default='teams/support/assistant',
                       help='Model/Agent ID (default: teams/support/assistant)')
    parser.add_argument('message', nargs='?', default='Hello!',
                       help='Message to send (default: Hello!)')
    parser.add_argument('--stream', action='store_true',
                       help='Enable streaming mode')
    parser.add_argument('--api-base', default='http://localhost:3000/v1',
                       help='API base URL (default: http://localhost:3000/v1)')
    parser.add_argument('--api-key', default='not-needed',
                       help='API key (default: not-needed)')
    parser.add_argument('-t', '--temperature', type=float, default=0.7,
                       help='Temperature (default: 0.7)')
    parser.add_argument('--max-tokens', type=int,
                       help='Max tokens')
    parser.add_argument('--verbose', action='store_true',
                       help='Show full output without truncation')

    args = parser.parse_args()

    # Create OpenAI client
    client = OpenAI(
        base_url=args.api_base,
        api_key=args.api_key
    )

    # Prepare request for Responses API
    request_params = {
        'model': args.model,
        'input': args.message,
        'temperature': args.temperature,
        'stream': args.stream
    }

    if args.max_tokens:
        request_params['max_output_tokens'] = args.max_tokens

    try:
        if args.stream:
            # Streaming mode
            print(f"{Colors.BOLD}🤖 {args.model}{Colors.RESET} {Colors.DIM}(streaming){Colors.RESET}\n", flush=True)
            stream = client.responses.create(**request_params)

            function_calls = {}  # Track function calls by item_id

            for event in stream:
                if not hasattr(event, 'type'):
                    continue

                # Text output
                if event.type == 'response.output_text.delta':
                    print(f"{Colors.GREEN}{event.delta}{Colors.RESET}", end='', flush=True)

                # Function call item added - capture function name
                elif event.type == 'response.output_item.added':
                    if hasattr(event, 'item') and event.item.type == 'function_call':
                        item_id = event.item.id
                        function_name = event.item.name if hasattr(event.item, 'name') else 'unknown'
                        function_calls[item_id] = {
                            'name': function_name,
                            'arguments': ''
                        }
                        print(f"\n{Colors.BLUE}🔧 {function_name}{Colors.RESET}", flush=True)

                # Function call arguments delta
                elif event.type == 'response.function_call_arguments.delta':
                    item_id = event.item_id
                    if item_id in function_calls:
                        function_calls[item_id]['arguments'] += event.delta

                # Function call completed
                elif event.type == 'response.function_call_arguments.done':
                    item_id = event.item_id
                    if item_id in function_calls:
                        try:
                            func_args = json.loads(function_calls[item_id]['arguments'])
                            formatted = format_json(func_args, max_length=200, verbose=args.verbose)
                            print(f"{Colors.CYAN}   → {formatted}{Colors.RESET}", flush=True)
                        except:
                            print(f"{Colors.CYAN}   → {function_calls[item_id]['arguments']}{Colors.RESET}", flush=True)

                elif event.type == "run_item_stream_event":
                    if event.name == "tool_output":
                      tool_name = event.item["rawItem"]["name"]
                      output_json = event.item["output"]
                      output = json.loads(output_json)

                      formatted = format_json(output, max_length=500, verbose=args.verbose)
                      print(f"{Colors.YELLOW}   ← {formatted}{Colors.RESET}", flush=True)

            print()  # New line at the end
        else:
            # Non-streaming mode
            response = client.responses.create(**request_params)

            # Process all output items
            if response.output and len(response.output) > 0:
                for item in response.output:
                    # Message output
                    if item.type == 'message' and hasattr(item, 'content') and len(item.content) > 0:
                        for content_part in item.content:
                            if content_part.type == 'output_text':
                                print(f"{Colors.BOLD}🤖 {args.model}:{Colors.RESET}\n{Colors.GREEN}{content_part.text}{Colors.RESET}")

                    # Function call output
                    elif item.type == 'function_call':
                        print(f"{Colors.BLUE}🔧 {item.name}{Colors.RESET}")
                        if hasattr(item, 'arguments'):
                            try:
                                func_args = json.loads(item.arguments)
                                formatted = format_json(func_args, max_length=200, verbose=args.verbose)
                                print(f"{Colors.CYAN}   → {formatted}{Colors.RESET}")
                            except:
                                print(f"{Colors.CYAN}   → {item.arguments}{Colors.RESET}")
            else:
                print(f"{Colors.BOLD}🤖 {args.model}:{Colors.RESET} {Colors.DIM}(no output){Colors.RESET}")

    except Exception as e:
        print(f"{Colors.RED}❌ Error: {e}{Colors.RESET}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
