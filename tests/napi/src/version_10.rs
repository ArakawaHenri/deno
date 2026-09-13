// Copyright 2018-2026 the Deno authors. MIT license.

#![allow(unused_unsafe, reason = "napi_sys functions are unsafe on Windows")]
#![allow(clippy::undocumented_unsafe_blocks, reason = "test napi code")]
#![allow(
  clippy::macro_metavars_in_unsafe,
  reason = "shared Node-API test assertion helper"
)]

use std::ffi::c_void;
use std::ptr;
use std::sync::atomic::AtomicU32;
use std::sync::atomic::Ordering;

use napi_sys::*;

mod macros;

static FINALIZERS: AtomicU32 = AtomicU32::new(0);

unsafe extern "C" fn finalize(
  env: napi_env,
  data: *mut c_void,
  _hint: *mut c_void,
) {
  let reference = unsafe { Box::from_raw(data.cast::<napi_ref>()) };
  let mut callback = ptr::null_mut();
  let mut receiver = ptr::null_mut();
  assert_napi_ok!(napi_get_reference_value(env, *reference, &mut callback));
  assert_napi_ok!(napi_get_undefined(env, &mut receiver));
  assert_eq!(
    unsafe {
      napi_call_function(
        env,
        receiver,
        callback,
        0,
        ptr::null(),
        ptr::null_mut(),
      )
    },
    Status::napi_cannot_run_js
  );
  assert_napi_ok!(napi_delete_reference(env, *reference));
  FINALIZERS.fetch_add(1, Ordering::SeqCst);
}

extern "C" fn create(env: napi_env, info: napi_callback_info) -> napi_value {
  let (args, argc, _) = napi_get_callback_info!(env, info, 1);
  assert_eq!(argc, 1);
  let mut reference = Box::new(ptr::null_mut());
  assert_napi_ok!(napi_create_reference(env, args[0], 1, &mut *reference));
  let mut value = ptr::null_mut();
  assert_napi_ok!(napi_create_object(env, &mut value));
  assert_napi_ok!(napi_add_finalizer(
    env,
    value,
    Box::into_raw(reference).cast(),
    Some(finalize),
    ptr::null_mut(),
    ptr::null_mut()
  ));
  value
}

extern "C" fn count(env: napi_env, _info: napi_callback_info) -> napi_value {
  let mut result = ptr::null_mut();
  assert_napi_ok!(napi_create_uint32(
    env,
    FINALIZERS.load(Ordering::SeqCst),
    &mut result
  ));
  result
}

#[unsafe(no_mangle)]
extern "C" fn node_api_module_get_api_version_v1() -> i32 {
  10
}

#[unsafe(no_mangle)]
unsafe extern "C" fn napi_register_module_v1(
  env: napi_env,
  exports: napi_value,
) -> napi_value {
  #[cfg(windows)]
  unsafe {
    napi_sys::setup();
  }
  let properties = &[
    napi_new_property!(env, "create", create),
    napi_new_property!(env, "count", count),
  ];
  assert_napi_ok!(napi_define_properties(
    env,
    exports,
    properties.len(),
    properties.as_ptr()
  ));
  exports
}
