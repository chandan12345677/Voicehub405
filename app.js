// ===============================
// SUPABASE CONFIG
// ===============================
const SUPABASE_URL = "https://tirijzueanfcwbuwfleu.supabase.co";
const SUPABASE_KEY = "sb_publishable_xeZGamCZGPiuLQaDcau9xA_iM0Z2LDV";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let strangerUser = null;

// ===============================
// ELEMENTS
// ===============================
const authPage = document.getElementById("authPage");
const mainApp = document.getElementById("mainApp");

const signupBtn = document.getElementById("signupBtn");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const googleLoginBtn = document.getElementById("googleLoginBtn");

const authMsg = document.getElementById("authMsg");

// Tabs
const tabBtns = document.querySelectorAll(".tabBtn");
const tabs = document.querySelectorAll(".tab");

// Feed
const feedDiv = document.getElementById("feed");

// Upload
const voiceFile = document.getElementById("voiceFile");
const captionInput = document.getElementById("caption");
const uploadBtn = document.getElementById("uploadBtn");
const uploadMsg = document.getElementById("uploadMsg");

// Profile
const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileMsg = document.getElementById("profileMsg");

// Chat
const findStrangerBtn = document.getElementById("findStrangerBtn");
const strangerInfo = document.getElementById("strangerInfo");
const chatBox = document.getElementById("chatBox");
const chatMsgInput = document.getElementById("chatMsg");
const sendChatBtn = document.getElementById("sendChatBtn");

// Battle
const battleVoice1 = document.getElementById("battleVoice1");
const createBattleBtn = document.getElementById("createBattleBtn");
const battleFeed = document.getElementById("battleFeed");
const leaderboardDiv = document.getElementById("leaderboard");

// ===============================
// TAB SWITCHING
// ===============================
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    tabBtns.forEach(b => b.classList.remove("activeTab"));
    tabs.forEach(t => t.classList.remove("active"));

    btn.classList.add("activeTab");
    document.getElementById(btn.dataset.tab).classList.add("active");
  });
});

// ===============================
// SESSION AUTO LOGIN
// ===============================
window.addEventListener("load", async () => {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    currentUser = data.session.user;
    await createProfileIfNotExists(currentUser);
    openApp();
  }
});

// ===============================
// OPEN APP
// ===============================
function openApp() {
  authPage.classList.remove("active");
  mainApp.classList.add("active");

  loadFeed();
  loadProfile();
  loadBattles();
  loadLeaderboard();
}

// ===============================
// GOOGLE LOGIN
// ===============================
googleLoginBtn.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) authMsg.innerText = error.message;
});

// ===============================
// EMAIL SIGNUP
// ===============================
signupBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signUp({ email, password });

  if (error) authMsg.innerText = error.message;
  else authMsg.innerText = "Signup done! Now login.";
});

// ===============================
// EMAIL LOGIN
// ===============================
loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    authMsg.innerText = error.message;
    return;
  }

  currentUser = data.user;
  await createProfileIfNotExists(currentUser);
  openApp();
});

// ===============================
// LOGOUT
// ===============================
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  location.reload();
});

// ===============================
// CREATE PROFILE IF NOT EXISTS
// ===============================
async function createProfileIfNotExists(user) {
  const { data } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!data) {
    await supabaseClient.from("profiles").insert({
      id: user.id,
      username: user.email ? user.email.split("@")[0] : "newuser",
      bio: "New VoiceW User"
    });
  }
}

// ===============================
// PROFILE SAVE / LOAD
// ===============================
async function loadProfile() {
  const { data } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();

  if (data) {
    usernameInput.value = data.username || "";
    bioInput.value = data.bio || "";
  }
}

saveProfileBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const bio = bioInput.value.trim();

  if (!username) {
    profileMsg.innerText = "Username required!";
    return;
  }

  const { error } = await supabaseClient.from("profiles").upsert({
    id: currentUser.id,
    username,
    bio
  });

  if (error) profileMsg.innerText = error.message;
  else profileMsg.innerText = "Profile Saved ✅";
});

// ===============================
// UPLOAD VOICE POST
// ===============================
uploadBtn.addEventListener("click", async () => {
  if (!voiceFile.files[0]) {
    uploadMsg.innerText = "Select audio file first!";
    return;
  }

  const file = voiceFile.files[0];
  const fileName = `${currentUser.id}_${Date.now()}_${file.name}`;

  const { error } = await supabaseClient.storage
    .from("voices")
    .upload(fileName, file);

  if (error) {
    uploadMsg.innerText = error.message;
    return;
  }

  const audio_url = `${SUPABASE_URL}/storage/v1/object/public/voices/${fileName}`;
  const caption = captionInput.value.trim();

  await supabaseClient.from("voice_posts").insert({
    user_id: currentUser.id,
    audio_url,
    caption
  });

  uploadMsg.innerText = "Uploaded Successfully ✅";
  captionInput.value = "";
  voiceFile.value = "";

  loadFeed();
});

// ===============================
// LOAD FEED
// ===============================
async function loadFeed() {
  feedDiv.innerHTML = "Loading...";

  const { data: posts } = await supabaseClient
    .from("voice_posts")
    .select("*")
    .order("created_at", { ascending: false });

  feedDiv.innerHTML = "";

  if (!posts || posts.length === 0) {
    feedDiv.innerHTML = "<p>No posts found.</p>";
    return;
  }

  for (let post of posts) {
    const { data: likes } = await supabaseClient
      .from("likes")
      .select("*")
      .eq("post_id", post.id);

    const likeCount = likes ? likes.length : 0;

    const card = document.createElement("div");
    card.className = "postCard";

    card.innerHTML = `
      <p><b>Caption:</b> ${post.caption || ""}</p>
      <audio controls src="${post.audio_url}"></audio>
      <p>❤️ Likes: ${likeCount}</p>

      <button onclick="likePost(${post.id})">Like</button>
      <button onclick="followUser('${post.user_id}')">Follow</button>

      <div class="commentBox">
        <input id="c_${post.id}" placeholder="Write comment...">
        <button onclick="addComment(${post.id})">Comment</button>
      </div>

      <div id="comments_${post.id}"></div>
    `;

    feedDiv.appendChild(card);

    loadComments(post.id);
  }
}

// ===============================
// LIKE POST
// ===============================
async function likePost(postId) {
  await supabaseClient.from("likes").insert({
    post_id: postId,
    user_id: currentUser.id
  });

  loadFeed();
}

// ===============================
// FOLLOW USER
// ===============================
async function followUser(userId) {
  if (userId === currentUser.id) {
    alert("You can't follow yourself!");
    return;
  }

  const { error } = await supabaseClient.from("follows").insert({
    follower_id: currentUser.id,
    following_id: userId
  });

  if (error) alert("Already followed or error!");
  else alert("Followed ✅");
}

// ===============================
// COMMENTS
// ===============================
async function addComment(postId) {
  const input = document.getElementById(`c_${postId}`);
  const text = input.value.trim();

  if (!text) return;

  await supabaseClient.from("comments").insert({
    post_id: postId,
    user_id: currentUser.id,
    comment: text
  });

  input.value = "";
  loadComments(postId);
}

async function loadComments(postId) {
  const div = document.getElementById(`comments_${postId}`);

  const { data: comments } = await supabaseClient
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: false });

  div.innerHTML = "";

  if (!comments || comments.length === 0) return;

  comments.forEach(c => {
    div.innerHTML += `<p>💬 ${c.comment}</p>`;
  });
}

// ===============================
// STRANGER CHAT SYSTEM
// ===============================
findStrangerBtn.addEventListener("click", async () => {
  const { data: users } = await supabaseClient
    .from("profiles")
    .select("*");

  if (!users || users.length < 2) {
    strangerInfo.innerText = "Not enough users!";
    return;
  }

  let random = users[Math.floor(Math.random() * users.length)];

  if (random.id === currentUser.id) {
    random = users[Math.floor(Math.random() * users.length)];
  }

  if (random.id === currentUser.id) {
    strangerInfo.innerText = "Try again!";
    return;
  }

  strangerUser = random;
  strangerInfo.innerText = `Connected with: ${random.username}`;

  loadChat();
});

sendChatBtn.addEventListener("click", async () => {
  if (!strangerUser) return alert("Find stranger first!");

  const msg = chatMsgInput.value.trim();
  if (!msg) return;

  await supabaseClient.from("chats").insert({
    sender_id: currentUser.id,
    receiver_id: strangerUser.id,
    message: msg
  });

  chatMsgInput.value = "";
  loadChat();
});

async function loadChat() {
  if (!strangerUser) return;

  const { data: chats } = await supabaseClient
    .from("chats")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${strangerUser.id}),and(sender_id.eq.${strangerUser.id},receiver_id.eq.${currentUser.id})`
    )
    .order("created_at", { ascending: true });

  chatBox.innerHTML = "";

  if (!chats) return;

  chats.forEach(c => {
    chatBox.innerHTML += `
      <div class="chatMsg">
        <b>${c.sender_id === currentUser.id ? "Me" : "Stranger"}:</b> ${c.message}
      </div>
    `;
  });

  chatBox.scrollTop = chatBox.scrollHeight;
}

// ===============================
// VOICE BATTLE SYSTEM
// ===============================
createBattleBtn.addEventListener("click", async () => {
  if (!battleVoice1.files[0]) return alert("Select voice file!");

  const file = battleVoice1.files[0];
  const fileName = `battle_${currentUser.id}_${Date.now()}_${file.name}`;

  const { error } = await supabaseClient.storage
    .from("voices")
    .upload(fileName, file);

  if (error) {
    alert(error.message);
    return;
  }

  const audio_url = `${SUPABASE_URL}/storage/v1/object/public/voices/${fileName}`;

  await supabaseClient.from("battles").insert({
    user1_id: currentUser.id,
    audio1_url: audio_url
  });

  alert("Battle Created ✅");
  battleVoice1.value = "";

  loadBattles();
});

async function loadBattles() {
  const { data: battles } = await supabaseClient
    .from("battles")
    .select("*")
    .order("created_at", { ascending: false });

  battleFeed.innerHTML = "";

  if (!battles || battles.length === 0) {
    battleFeed.innerHTML = "<p>No battles yet.</p>";
    return;
  }

  battles.forEach(b => {
    battleFeed.innerHTML += `
      <div class="postCard">
        <p><b>Battle ID:</b> ${b.id}</p>

        <p><b>Player 1</b></p>
        <audio controls src="${b.audio1_url}"></audio>
        <button onclick="voteBattle(${b.id}, 1)">Vote Player 1 (${b.votes1})</button>

        <hr>

        <p><b>Player 2</b></p>
        ${
          b.audio2_url
            ? `<audio controls src="${b.audio2_url}"></audio>
               <button onclick="voteBattle(${b.id}, 2)">Vote Player 2 (${b.votes2})</button>`
            : `<p>Waiting for opponent...</p>
               <button onclick="joinBattle(${b.id})">Join Battle</button>`
        }
      </div>
    `;
  });
}

async function joinBattle(battleId) {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "audio/*";

  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const fileName = `battle_join_${currentUser.id}_${Date.now()}_${file.name}`;

    const { error } = await supabaseClient.storage
      .from("voices")
      .upload(fileName, file);

    if (error) {
      alert(error.message);
      return;
    }

    const audio_url = `${SUPABASE_URL}/storage/v1/object/public/voices/${fileName}`;

    await supabaseClient.from("battles").update({
      user2_id: currentUser.id,
      audio2_url: audio_url
    }).eq("id", battleId);

    alert("Joined Battle ✅");
    loadBattles();
  };

  fileInput.click();
}

async function voteBattle(battleId, player) {
  const { data: already } = await supabaseClient
    .from("battle_votes")
    .select("*")
    .eq("battle_id", battleId)
    .eq("user_id", currentUser.id);

  if (already && already.length > 0) {
    alert("You already voted!");
    return;
  }

  await supabaseClient.from("battle_votes").insert({
    battle_id: battleId,
    user_id: currentUser.id,
    voted_for: player
  });

  if (player === 1) {
    await supabaseClient.rpc("increment_vote1", { battleid: battleId });
  } else {
    await supabaseClient.rpc("increment_vote2", { battleid: battleId });
  }

  loadBattles();
  loadLeaderboard();
}

// ===============================
// LEADERBOARD
// ===============================
async function loadLeaderboard() {
  const { data: battles } = await supabaseClient
    .from("battles")
    .select("*");

  leaderboardDiv.innerHTML = "";

  if (!battles || battles.length === 0) {
    leaderboardDiv.innerHTML = "<p>No leaderboard yet.</p>";
    return;
  }

  let scores = {};

  battles.forEach(b => {
    if (b.user1_id) scores[b.user1_id] = (scores[b.user1_id] || 0) + (b.votes1 || 0);
    if (b.user2_id) scores[b.user2_id] = (scores[b.user2_id] || 0) + (b.votes2 || 0);
  });

  Object.keys(scores).forEach(uid => {
    leaderboardDiv.innerHTML += `<p>👤 ${uid} : <b>${scores[uid]}</b> votes</p>`;
  });
}