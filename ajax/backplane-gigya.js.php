<?php

// See: http://developers.gigya.com/010_Developer_Guide/82_Socialize_Setup
define('GIGYA_API_KEY', '');
define('GIGYA_SECRET', '');

// Gigya SDK: http://developers.gigya.com/030_Server_SDKs/PHP
require_once '../lib/GSSDK.php';

// Backplane
define('BACKPLANE_BUSINESS_NAME', '');
define('BACKPLANE_BUSINESS_SECRET', '');

// Backplane.php: http://wiki.aboutecho.com/w/page/28068607/Single%20Sign%20On#Proprietaryloginonly
require_once '../lib/Backplane.php';
$backplane = new Backplane(BACKPLANE_BUSINESS_NAME, BACKPLANE_BUSINESS_SECRET);

$response = array();
try {
  // Confirm POST data is present
  $requiredKeys = array('UID', 'UIDSignature', 'signatureTimestamp', 'channelID');
  foreach($requiredKeys as $key) {
    if(empty($_POST[$key])) {
      throw new InvalidArgumentException('Missing parameter: ' . $key);
    }
  }

  // Validate user signature
  $validSignature = SigUtils::validateUserSignature($_POST['UID'], $_POST['signatureTimestamp'], GIGYA_SECRET, $_POST['UIDSignature']);
  if(!$validSignature) {
    throw new ErrorException('Invalid user signature.');
  }

  // Fetch user directly from Gigya
  $request = new GSRequest(GIGYA_API_KEY, GIGYA_SECRET, "socialize.getUserInfo", new GSObject(array(
    'UID' => $_POST['UID'],
  )));
  $userInfo = $request->send();
  if($userInfo->getErrorCode() != 0) {
    throw new ErrorException($userInfo->getErrorMessage());
  }

  // Send authentication message to Backplane: http://wiki.aboutecho.com/w/page/28068607/Single%20Sign%20On#Proprietaryloginonly
  $channelID = $_POST['channelID'];
  $backplaneResponse = json_decode($backplane->send(array(
    'type'          => 'identity/login',
    'source'        => 'http://localhost/', // User login source URL
    'channel'       => $channelID,
    'user_id_url'   => 'http://localhost1234.com/' . $userInfo->getString('UID'), // User profile URL -- unique ID
    'display_name'  => $userInfo->getString('nickname'),
    'photo'         => $userInfo->getString('photoURL'),
  )), true);
  var_dump($backplaneResponse);
  if($backplaneResponse['result'] === 'error') {
    throw new ErrorException($backplaneResponse['errorMessage']);
  }
  $response = array(
    'success'   => true,
    'channelID' => $channelID,
  );
} catch(Exception $e) {
  $response = array(
    'success'       => false,
    'errorMessage'  => $e->getMessage(),
  );
}

// Return as JSON
header('Content-Type: text/javascript; charset=utf8');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Max-Age: 1');
header('Access-Control-Allow-Origin: http://' . SITE_DOMAIN . '/');
echo json_encode($response);