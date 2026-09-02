// Copyright 2019-2024 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

const COMMANDS: &[&str] = &[];

fn main() {
    let result = tauri_plugin::Builder::new(COMMANDS)
        .ios_path("ios")
        .try_build();

    if !(cfg!(docsrs) && std::env::var("TARGET").unwrap().contains("android")) {
        result.unwrap();
    }
}
