// Convenience navigation only. This is not authentication.
if (sessionStorage.getItem('bramble-admin-unlocked') !== 'true') {
  window.location.replace('../#top');
}
