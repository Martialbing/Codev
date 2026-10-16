//! Windows glass material. Keep the accent policy independent of window activation.
//! The optional user32 entry point is also used by window-vibrancy on Windows 10.
//! Resolve it dynamically and report failure instead of silently claiming support.
use std::{ffi::c_void, mem::size_of};
use windows_sys::Win32::{
    Foundation::HWND,
    Graphics::Dwm::{DwmSetWindowAttribute, DWMWA_WINDOW_CORNER_PREFERENCE, DWMWCP_ROUND},
    System::LibraryLoader::{GetModuleHandleW, GetProcAddress},
};

#[repr(C)]
struct AccentPolicy {
    state: i32,
    flags: u32,
    color: u32,
    animation: u32,
}

#[repr(C)]
struct CompositionAttribute {
    attribute: i32,
    data: *mut c_void,
    size: usize,
}

type SetComposition = unsafe extern "system" fn(HWND, *mut CompositionAttribute) -> i32;

pub fn apply(window: &tauri::WebviewWindow, glass: bool, dark: bool) -> Result<bool, String> {
    use tauri::window::Color;
    let hwnd = window.hwnd().map_err(|e| e.to_string())?.0;
    window.set_theme(Some(if dark { tauri::Theme::Dark } else { tauri::Theme::Light }))
        .map_err(|e| e.to_string())?;
    window.set_background_color(Some(Color(0, 0, 0, 0))).map_err(|e| e.to_string())?;
    // Clear the system backdrop before installing an accent policy: never stack both.
    window.set_effects(None).map_err(|e| e.to_string())?;
    window.set_shadow(true).map_err(|e| e.to_string())?;
    let corner = DWMWCP_ROUND;
    // SAFETY: hwnd belongs to this live WebView window, and corner is valid for this attribute.
    let corner_result = unsafe {
        DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE as u32, &corner as *const _ as _, size_of_val(&corner) as u32)
    };
    if corner_result < 0 {
        log::warn!("Native rounded corners unavailable: {corner_result:#x}");
    }
    let library: Vec<u16> = "user32.dll\0".encode_utf16().collect();
    // SAFETY: user32 is a process-loaded module; the function pointer is used only while loaded.
    let function = unsafe {
        let module = GetModuleHandleW(library.as_ptr());
        GetProcAddress(module, c"SetWindowCompositionAttribute".as_ptr().cast())
    }.ok_or("Window composition API is unavailable")?;
    // SAFETY: this signature matches the optional user32 API used by window-vibrancy.
    let set_composition: SetComposition = unsafe { std::mem::transmute(function) };
    // ABGR. A neutral, thicker tint restrains wallpaper color without hiding its blur.
    let (r, g, b, a) = if dark { (28u32, 31u32, 36u32, 190u32) } else { (242, 245, 249, 184) };
    let mut policy = AccentPolicy {
        state: if glass { 4 } else { 0 },
        flags: 0,
        color: r | g << 8 | b << 16 | a << 24,
        animation: 0,
    };
    let mut attribute = CompositionAttribute {
        attribute: 19,
        data: (&mut policy as *mut AccentPolicy).cast(),
        size: size_of::<AccentPolicy>(),
    };
    // SAFETY: the structures are C-compatible and remain alive for this synchronous call.
    if unsafe { set_composition(hwnd, &mut attribute) } == 0 {
        return Err("Windows rejected the glass composition policy".into());
    }
    Ok(glass)
}
