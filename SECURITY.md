# Security Policy

## Overview

Claude Model Triage is a small, public TypeScript library for selecting Anthropic Claude models and effort levels based on task type and agent role. It contains no network calls, no credentials, and no user data.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| main    | Yes       |

Only the latest commit on `main` is considered supported for security reports.

## Reporting a Vulnerability

If you discover a security issue in this repository (for example, a logic flaw that could lead to unintended model selection or effort levels in a safety-critical context), please report it privately.

**Preferred method:** Open a private security advisory on this GitHub repository  
(Security → Advisories → Report a vulnerability).

Alternatively, you may contact the maintainer directly. Please include:

- A clear description of the issue
- Steps to reproduce (if applicable)
- Any relevant code paths or files
- Your assessment of impact and severity

**Do not** open a public GitHub issue for security vulnerabilities.

## What to Expect

- Acknowledgment of your report within a reasonable timeframe
- A discussion of the issue and any proposed fix
- Credit in the advisory (if you wish) once resolved

## Scope

In scope:
- Model and effort selection logic
- Validation helpers
- Any accidental inclusion of secrets or credentials

Out of scope:
- Issues that depend on external Anthropic APIs or pricing changes
- General suggestions that do not represent a concrete vulnerability in the library code

## Secrets

This repository should contain **no secrets**. If you find any credentials or tokens, please report them immediately.

## Thank You

Responsible disclosure helps keep the library safer for anyone using it.
