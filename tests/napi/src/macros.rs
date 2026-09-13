// Copyright 2018-2026 the Deno authors. MIT license.

#[macro_export]
macro_rules! cstr {
  ($s: literal) => {{ std::ffi::CString::new($s).unwrap().into_raw() }};
}

#[macro_export]
macro_rules! assert_napi_ok {
  ($call: expr) => {{
    assert_eq!(
      {
        #[allow(
          unused_unsafe,
          reason = "napi_sys safe fn in unsafe extern blocks"
        )]
        unsafe {
          $call
        }
      },
      napi_sys::Status::napi_ok
    );
  }};
}

#[macro_export]
macro_rules! napi_get_callback_info {
  ($env: expr, $callback_info: expr, $size: literal) => {{
    let mut args = [std::ptr::null_mut(); $size];
    let mut argc = $size;
    let mut this = std::ptr::null_mut();
    $crate::assert_napi_ok!(napi_get_cb_info(
      $env,
      $callback_info,
      &mut argc,
      args.as_mut_ptr(),
      &mut this,
      std::ptr::null_mut(),
    ));
    (args, argc, this)
  }};
}

#[macro_export]
macro_rules! napi_new_property {
  ($env: expr, $name: expr, $value: expr) => {
    napi_property_descriptor {
      utf8name: concat!($name, "\0").as_ptr() as *const std::os::raw::c_char,
      name: std::ptr::null_mut(),
      method: Some($value),
      getter: None,
      setter: None,
      data: std::ptr::null_mut(),
      attributes: 0,
      value: std::ptr::null_mut(),
    }
  };
}
