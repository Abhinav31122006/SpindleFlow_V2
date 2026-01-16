#!/bin/bash
# Tool Invocation Test Runner
# This script tests both tool invocation configurations

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      SpindleFlow - Tool Invocation Test Suite            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Sequential Workflow with Tools
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Sequential Workflow with Tool Invocation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Config: configs/tests/tool-sequential.yml"
echo "Agents: 4 (with python, sql, javascript, rust, cpp, shell, http)"
echo "Input: 'Design a microservices data platform with monitoring'"
echo ""
echo "Running..."
npm run dev run configs/tests/tool-sequential.yml -- --input "Design a microservices data platform with monitoring"
echo ""
echo "✓ Test 1 complete"
echo ""

# Small delay
sleep 2

# Test 2: Parallel Workflow with Tools
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Parallel Workflow with Tool Invocation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Config: configs/tests/tool-parallel.yml"
echo "Agents: 3 parallel branches + 1 aggregator (all with tools)"
echo "Input: 'Evaluate multi-language microservice architecture'"
echo ""
echo "Running..."
npm run dev run configs/tests/tool-parallel.yml -- --input "Evaluate multi-language microservice architecture"
echo ""
echo "✓ Test 2 complete"
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              All Tool Invocation Tests Complete          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "What to verify:"
echo "  ✓ Tool invocation logs (🔧 Invoking tools...)"
echo "  ✓ Tool execution complete logs (✅ Tools invoked...)"
echo "  ✓ Tool outputs in agent context (check verbose logs)"
echo "  ✓ Deterministic execution (same tools every time)"
echo ""
