/*
CS 4273 – Capstone | Fall 2026 | GROUP F

@brief: Unit tests for get_decision() in AMEParser.py using C++ and GTest.

Execution Steps:
1. Install CMake from https://cmake.org/download/ for your OS
2. Run: cmake -B build
    (NOTE): Above command configures CMake and creates new build folder
3. Run: cmake --build build
    (NOTE): Above command compiles code to an executable and stores in build folder
4. Run executable: 
    - Windows: ./build/Debug/CppUnitTest.exe
    - Mac/Linux: ./build/CppUnitTest
*/

// GTest
#include <gtest/gtest.h>
// Standard Libraries
#include <string>
#include <cctype>

// C++ version of get_decision() in AMEParser.py
std::string get_decision(std::string text)
{
    // convert entire text to uppercase
    for (auto &character : text)
    {
        character = std::toupper(character);
    }

    if (text.find("DEFER") != std::string::npos)
    {
        return "DEFER";
    }
    else if (text.find("DENY") != std::string::npos)
    {
        return "DENY";
    }
    else if (text.find("SPECIAL ISSUANCE") != std::string::npos)
    {
        return "SPECIAL ISSUANCE";
    }
    else if (text.find("ISSUE") != std::string::npos)
    {
        return "ISSUE";
    }

    return "UNKNOWN";
}

namespace AMEParserTest
{
    TEST(DispositionSuite, IssueTest)
    {
        EXPECT_EQ("ISSUE", get_decision("AME may issue"));
    }

    TEST(DispositionSuite, DeferTest)
    {
        EXPECT_EQ("DEFER", get_decision("Defer to FAA"));
    }

    TEST(DispositionSuite, DenyTest)
    {
        EXPECT_EQ("DENY", get_decision("Deny the certificate"));
    }

    TEST(DispositionSuite, SpecialIssuanceTest)
    {
        EXPECT_EQ("SPECIAL ISSUANCE", get_decision("Special Issuance required"));
    }

    TEST(DispositionSuite, DeferTakesPriorityOverIssueTest)
    {
        // DEFER is checked before ISSUE, so this should return DEFER
        EXPECT_EQ("DEFER", get_decision("Defer, do not issue"));
    }

    TEST(DispositionSuite, UnknownDecisionTest)
    {
        EXPECT_EQ("UNKNOWN", get_decision("No matching keyword"));
    }

    TEST(DispositionSuite, NoneDecisionTest)
    {
        EXPECT_EQ("UNKNOWN", get_decision(""));
    }

    TEST(DispositionSuite, CaseInsensitiveTest)
    {
        EXPECT_EQ("DEFER", get_decision("defer"));
    }

    TEST(DispositionSuite, IssueInActionTextTest)
    {
        EXPECT_EQ("ISSUE", get_decision("ISSUE\nAME may issue and note this in Block 60."));
    }
}
