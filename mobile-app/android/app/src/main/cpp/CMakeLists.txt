cmake_minimum_required(VERSION 3.22.1)
project("realgram_vpn")

add_library(realgram_vpn SHARED tunnel_helper.cpp)
target_link_libraries(realgram_vpn android log)
