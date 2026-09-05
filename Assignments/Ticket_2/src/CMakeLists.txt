cmake_minimum_required(VERSION 3.14)
project(CppUnitTest CXX)

# module for integrating external dependencies during configuration 
include(FetchContent)

# define external dependency we want to integrate (Gtest)
FetchContent_Declare(
  googletest
  GIT_REPOSITORY https://github.com/google/googletest.git
  GIT_TAG v1.14.0
)

# download Gtest
FetchContent_MakeAvailable(googletest)

add_executable(CppUnitTest AMEParserTest.cpp)
#gtest_main library contains pre-written main function to execute tests 
target_link_libraries(CppUnitTest gtest_main)


