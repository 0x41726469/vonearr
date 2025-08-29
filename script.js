document.addEventListener("DOMContentLoaded", () => {
  // ================================================
  //          KONFIGURASI DAN INISIALISASI
  // ================================================

  // Inisialisasi Supabase client dengan URL dan Kunci Anonim
  const SUPABASE_URL = window.env.SUPABASE_URL; 
  const SUPABASE_ANON_KEY = window.env.SUPABASE_ANON_KEY;
  
  const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  // Variabel dan konstanta global
  const ADMIN_PASSWORD_HASH =
    "a54942c8e365f3784f38b8d437f9d708290db60738b00cdcfb934c32d1be97f3";
  const PROJECT_FILES_KEY = "portfolio-project-files";
  const RECYCLE_BIN_KEY = "portfolio-recycle-bin";
  const SUGGESTIONS_KEY = "portfolio-suggestions";

  // Elemen-elemen DOM utama
  const loadingScreen = document.getElementById("loading-screen");
  const loadingText = document.querySelector(".loading-text");
  const desktop = document.querySelector(".desktop");
  const taskbarApps = document.getElementById("taskbar-apps");
  const startButton = document.getElementById("start-button");
  const startMenu = document.getElementById("start-menu");
  const startMenuItems = document.querySelectorAll(".start-menu-item");
  const recycleBinIcon = document.querySelector("#recycle-bin-icon img");
  const adminControl = document.getElementById("admin-control");

  // State aplikasi
  let highestZIndex = 2; // Mengatur urutan tumpukan (z-index) jendela
  let activeWindowId = null; // ID jendela yang sedang aktif
  let windowInstanceCounter = 0; // Penghitung untuk ID jendela unik
  const openWindows = {}; // Objek untuk melacak jendela yang terbuka

  // Fungsi utilitas
  const isMobile = () => window.innerWidth <= 768; // Cek apakah perangkat mobile
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Efek loading saat aplikasi pertama kali dimuat
  setTimeout(() => {
    loadingText.classList.add("split");
    setTimeout(() => {
      loadingScreen.classList.add("hidden");
      initApp(); // Memulai aplikasi setelah loading selesai
    }, 1500);
  }, 1500);

  // ================================================
  //       FUNGSI INTERAKSI DENGAN DATABASE
  // ================================================

  /**
   * Mengambil data saran (suggestions) dari tabel 'suggestions' di Supabase.
   * @returns {Array<Object>} Array berisi saran-saran.
   */
  const getSuggestionsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from("suggestions")
        .select("teks, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching suggestions:", error);
        return [];
      }
      return data.map((item) => ({
        text: item.teks,
        timestamp: new Date(item.created_at).getTime(),
      }));
    } catch (error) {
      console.error("Error in getSuggestionsFromSupabase:", error);
      return [];
    }
  };

  /**
   * Menyimpan saran baru ke tabel 'suggestions' di Supabase.
   * @param {string} text - Teks saran yang akan disimpan.
   * @returns {boolean} Status keberhasilan.
   */
  const saveSuggestionToSupabase = async (text) => {
    try {
      const { error } = await supabase
        .from("suggestions")
        .insert([{ teks: text }]);

      if (error) {
        console.error("Error saving suggestion:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error in saveSuggestionToSupabase:", error);
      return false;
    }
  };

  /**
   * Menghapus semua saran dari tabel 'suggestions' di Supabase.
   * @returns {boolean} Status keberhasilan.
   */
  const clearSuggestionsFromSupabase = async () => {
    try {
      const { error } = await supabase
        .from("suggestions")
        .delete()
        .neq("id", 0); // Menghapus semua baris

      if (error) {
        console.error("Error clearing suggestions:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error in clearSuggestionsFromSupabase:", error);
      return false;
    }
  };

  /**
   * Mengambil daftar proyek dari tabel 'projects' di Supabase.
   * @returns {Array<Object>} Array berisi data proyek.
   */
  const getProjectsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("name, file_url, file_size, uploaded_at")
        .eq("is_deleted", false) // Hanya ambil yang belum dihapus
        .order("uploaded_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects:", error);
        return [];
      }
      return data.map((project) => ({
        name: project.name,
        dataUrl: project.file_url,
        size: project.file_size,
        uploadedAt: project.uploaded_at,
      }));
    } catch (error) {
      console.error("Error in getProjectsFromSupabase:", error);
      return [];
    }
  };

  /**
   * Mengunggah file proyek ke Supabase Storage dan menyimpan metadatanya di database.
   * @param {File} file - File yang akan diunggah.
   * @returns {boolean} Status keberhasilan.
   */
  const uploadProjectToSupabase = async (file) => {
    try {
      // 1. Upload file ke Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("projects")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Error uploading file:", uploadError);
        return false;
      }

      // 2. Dapatkan URL publik dari file yang diunggah
      const { data: urlData } = supabase.storage
        .from("projects")
        .getPublicUrl(fileName);

      // 3. Simpan metadata proyek ke tabel 'projects' di database
      const { error: dbError } = await supabase.from("projects").insert([
        {
          name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
        },
      ]);

      if (dbError) {
        console.error("Error saving project metadata:", dbError);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error in uploadProjectToSupabase:", error);
      return false;
    }
  };

  /**
   * Melakukan "soft delete" pada proyek dengan mengubah statusnya menjadi 'is_deleted'.
   * @param {string} projectName - Nama proyek yang akan dihapus.
   * @returns {boolean} Status keberhasilan.
   */
  const moveProjectToRecycleBin = async (projectName) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ is_deleted: true })
        .eq("name", projectName); // Mencari proyek berdasarkan nama

      if (error) {
        console.error("Error moving project to bin:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error in moveProjectToRecycleBin:", error);
      return false;
    }
  };

  // ================================================
  //         FUNGSI LOKALSTORAGE & LAINNYA
  // ================================================

  /**
   * Mengambil data dari localStorage atau Supabase (untuk suggestions).
   * @param {string} key - Kunci data yang akan diambil.
   * @returns {Array} Data yang diambil atau array kosong jika tidak ada/error.
   */
  const getFromStorage = async (key) => {
    try {
      if (key === SUGGESTIONS_KEY) {
        return await getSuggestionsFromSupabase();
      }
      const data = localStorage.getItem(key);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(`Error parsing data for key "${key}":`, error);
      return [];
    }
  };

  /**
   * Menyimpan data ke localStorage atau Supabase (untuk suggestions).
   * @param {string} key - Kunci data yang akan disimpan.
   * @param {Array} data - Data yang akan disimpan.
   * @returns {boolean} Status keberhasilan.
   */
  const saveToStorage = async (key, data) => {
    try {
      if (key === SUGGESTIONS_KEY && data.length > 0) {
        const newSuggestion = data[data.length - 1];
        return await saveSuggestionToSupabase(newSuggestion.text);
      }
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error saving data for key "${key}":`, error);
      alert("Could not save data. Storage might be full.");
      return false;
    }
  };

  /**
   * Memperbarui ikon tempat sampah (recycle bin) berdasarkan isinya.
   */
  const updateRecycleBinIcon = () => {
    const binItems = getFromStorage(RECYCLE_BIN_KEY);
    recycleBinIcon.src =
      binItems.length > 0
        ? "https://win98icons.alexmeub.com/icons/png/recycle_bin_full_2k-4.png"
        : "https://win98icons.alexmeub.com/icons/png/recycle_bin_empty-4.png";
  };

  /**
   * Memuat ulang konten dari semua jendela yang terbuka secara dinamis.
   */
  const refreshDynamicWindows = () => {
    Object.values(openWindows).forEach((win) => {
      if (win.templateId === "projects-window") initProjectsWindow(win.element);
      if (win.templateId === "recycle-bin-window")
        initRecycleBinWindow(win.element);
      if (win.templateId === "suggestion-window")
        initSuggestionWindow(win.element);
    });
    updateRecycleBinIcon();
  };

  // ================================================
  //          FUNGSI UTAMA APLIKASI
  // ================================================

  /**
   * Menginisialisasi CAPTCHA saat aplikasi dimuat.
   */
  const initCaptcha = () => {
    const captchaOverlay = document.getElementById("captcha-overlay");
    const captchaForm = document.getElementById("captcha-form");
    const captchaQuestion = document.getElementById("captcha-question");
    const captchaInput = document.getElementById("captcha-input");
    const captchaError = document.getElementById("captcha-error");
    const correctMessage = document.getElementById("correct-message");
    let correctAnswer;

    const generateCaptcha = () => {
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      correctAnswer = num1 + num2;
      captchaQuestion.textContent = `What is ${num1} + ${num2}?`;
      captchaError.textContent = "";
      captchaInput.value = "";
    };

    captchaForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (parseInt(captchaInput.value, 10) === correctAnswer) {
        new Audio("/assets/sounds/loading.mp3").play();
        captchaOverlay.style.display = "none";
        correctMessage.style.display = "block";
        setTimeout(() => {
          correctMessage.style.display = "none";
        }, 1500);
      } else {
        captchaError.textContent = "Incorrect. Please try again.";
        generateCaptcha();
        captchaInput.focus();
      }
    });

    captchaOverlay.style.display = "flex";
    generateCaptcha();
    captchaInput.focus();
  };

  /**
   * Menginisialisasi jam di taskbar.
   */
  const initClock = () => {
    const clockElement = document.getElementById("clock");
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      clockElement.textContent = `${hours}:${minutes}`;
    };
    setInterval(updateClock, 1000);
    updateClock();
  };

  /**
   * Meminimalkan jendela ke taskbar.
   * @param {string} windowId - ID jendela yang akan diminimalkan.
   */
  const minimizeWindow = (windowId) => {
    const windowData = openWindows[windowId];
    if (!windowData) return;
    windowData.element.style.display = "none";
    const app = document.querySelector(
      `.taskbar-app[data-window="${windowId}"]`
    );
    if (app) {
      app.classList.add("minimized");
      app.classList.remove("active");
    }
    if (activeWindowId === windowId) {
      activeWindowId = null;
    }
  };

  /**
   * Mengubah status jendela antara maksimal dan normal.
   * @param {string} windowId - ID jendela yang akan diubah ukurannya.
   */
  const toggleMaximize = (windowId) => {
    const windowData = openWindows[windowId];
    if (!windowData || isMobile()) return;
    const windowElement = windowData.element;
    if (windowData.isMaximized) {
      // Mengembalikan ke ukuran dan posisi semula
      windowElement.style.top = windowData.originalState.top;
      windowElement.style.left = windowData.originalState.left;
      windowElement.style.width = windowData.originalState.width;
      windowElement.style.height = windowData.originalState.height;
      windowElement.classList.remove("maximized");
      windowData.isMaximized = false;
    } else {
      // Menyimpan posisi dan ukuran semula, lalu maksimalkan
      windowData.originalState = {
        top: windowElement.style.top,
        left: windowElement.style.left,
        width: windowElement.style.width,
        height: windowElement.style.height,
      };
      windowElement.classList.add("maximized");
      windowData.isMaximized = true;
    }
  };

  /**
   * Membawa jendela ke depan (mengatur z-index tertinggi).
   * @param {HTMLElement} windowElement - Elemen jendela yang akan dibawa ke depan.
   */
  const bringToFront = (windowElement) => {
    if (windowElement.style.display === "none") {
      windowElement.style.display = "flex";
      const app = document.querySelector(
        `.taskbar-app[data-window="${windowElement.id}"]`
      );
      if (app) {
        app.classList.remove("minimized");
      }
    }
    highestZIndex++;
    windowElement.style.zIndex = highestZIndex;
    activeWindowId = windowElement.id;
    document
      .querySelectorAll(".taskbar-app")
      .forEach((app) =>
        app.classList.toggle("active", app.dataset.window === activeWindowId)
      );
  };

  /**
   * Menambahkan fungsionalitas drag and drop ke sebuah jendela.
   * @param {HTMLElement} windowElement - Elemen jendela yang akan dibuat dapat digeser.
   */
  const makeDraggable = (windowElement) => {
    if (isMobile()) return;
    const titleBar = windowElement.querySelector(".title-bar");
    let isDragging = false,
      offsetX,
      offsetY;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      offsetX = e.clientX - windowElement.offsetLeft;
      offsetY = e.clientY - windowElement.offsetTop;
      document.body.style.cursor = "move";
      bringToFront(windowElement);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      let newX = e.clientX - offsetX;
      let newY = e.clientY - offsetY;
      const maxX = window.innerWidth - windowElement.offsetWidth;
      const maxY = window.innerHeight - windowElement.offsetHeight - 40;
      windowElement.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
      windowElement.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = "default";
    };

    titleBar.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    // Menyimpan fungsi cleanup untuk membersihkan event listener saat jendela ditutup
    openWindows[windowElement.id].cleanup.push(() => {
      titleBar.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    });
  };

  /**
   * Membuat ikon aplikasi di taskbar untuk jendela yang terbuka.
   * @param {string} windowId - ID jendela.
   * @param {string} templateId - ID template jendela.
   */
  const createTaskbarApp = (windowId, templateId) => {
    const windowElement = document.getElementById(windowId);
    const iconElement = document.querySelector(
      `.icon[data-window-template="${templateId}"] img`
    );
    const title = windowElement.querySelector(".title-bar span").textContent;
    const app = document.createElement("div");

    app.className = "taskbar-app";
    app.setAttribute("data-window", windowId);
    app.setAttribute("tabindex", "0");
    app.setAttribute("role", "button");
    app.setAttribute("aria-label", `Switch to ${title}`);
    app.innerHTML = `<img src="${iconElement.src}" alt="${title} icon"> <span>${title}</span>`;

    app.addEventListener("click", () => {
      const win = document.getElementById(windowId);
      // Jika jendela aktif, minimalkan. Jika tidak, bawa ke depan.
      if (win.style.zIndex == highestZIndex && win.style.display !== "none") {
        minimizeWindow(windowId);
      } else {
        bringToFront(win);
      }
    });

    taskbarApps.appendChild(app);
  };

  /**
   * Menutup jendela dan menghapus elemen terkait.
   * @param {string} windowId - ID jendela yang akan ditutup.
   */
  const closeWindow = (windowId) => {
    new Audio("/assets/sounds/op.mp3").play();
    const windowData = openWindows[windowId];
    if (!windowData) return;
    if (windowData.interval) clearInterval(windowData.interval); // Membersihkan interval (untuk game)
    windowData.cleanup.forEach((func) => func()); // Menjalankan fungsi cleanup
    windowData.element.remove();
    delete openWindows[windowId];
    const app = document.querySelector(
      `.taskbar-app[data-window="${windowId}"]`
    );
    if (app) app.remove();
    if (activeWindowId === windowId) activeWindowId = null;
  };

  /**
   * Membuka jendela baru dari template.
   * @param {string} templateId - ID template jendela yang akan dibuka.
   */
  const openWindow = (templateId) => {
    new Audio("/assets/sounds/op.mp3").play();
    const template = document.getElementById(templateId);
    if (!template) {
      console.error(`Template not found: ${templateId}`);
      return;
    }

    windowInstanceCounter++;
    const newWindowId = `window-instance-${windowInstanceCounter}`;
    const newWindow = template.cloneNode(true); // Menduplikasi template
    newWindow.id = newWindowId;
    newWindow.style.display = "flex";

    if (!isMobile()) {
      const offset = (Object.keys(openWindows).length % 10) * 20;
      newWindow.style.top = `${100 + offset}px`;
      newWindow.style.left = `${150 + offset}px`;
    }

    desktop.appendChild(newWindow);
    openWindows[newWindowId] = {
      element: newWindow,
      templateId,
      interval: null,
      cleanup: [],
      isMaximized: false,
      originalState: {},
    };

    makeDraggable(newWindow);
    newWindow.addEventListener("mousedown", () => bringToFront(newWindow));

    // Menghubungkan tombol kontrol jendela
    const minimizeBtn = newWindow.querySelector(".minimize-btn");
    const maximizeBtn = newWindow.querySelector(".maximize-btn");
    const closeBtn = newWindow.querySelector(".close-btn");
    const titleBar = newWindow.querySelector(".title-bar");
    if (closeBtn)
      closeBtn.addEventListener("click", () => closeWindow(newWindowId));
    if (minimizeBtn)
      minimizeBtn.addEventListener("click", () => minimizeWindow(newWindowId));
    if (maximizeBtn)
      maximizeBtn.addEventListener("click", () => toggleMaximize(newWindowId));
    if (titleBar) {
      titleBar.addEventListener("dblclick", (e) => {
        if (e.target === titleBar) {
          toggleMaximize(newWindowId);
        }
      });
    }

    // Peta fungsi inisialisasi berdasarkan templateId
    const initializers = {
      "terminal-window": initTerminal,
      "snake-window": initSnakeGame,
      "2048-window": init2048Game,
      "suggestion-window": initSuggestionWindow,
      "projects-window": initProjectsWindow,
      "recycle-bin-window": initRecycleBinWindow,
    };

    if (initializers[templateId]) {
      initializers[templateId](newWindow);
    }

    createTaskbarApp(newWindowId, templateId);
    bringToFront(newWindow);
  };

  /**
   * Menginisialisasi fungsionalitas jendela "Projects".
   * @param {HTMLElement} projectWindow - Elemen jendela Projects.
   */
  const initProjectsWindow = async (projectWindow) => {
    const listElement = projectWindow.querySelector(".project-files-list");
    const loginBtn = projectWindow.querySelector(".admin-login-btn");
    const uploadSection = projectWindow.querySelector(".admin-upload-section");
    const fileInput = projectWindow.querySelector(".project-file-input");
    const uploadBtn = projectWindow.querySelector(".project-upload-btn");

    projectWindow.dataset.isAdmin = "false";
    loginBtn.style.display = "block";
    uploadSection.style.display = "none";

    const loadProjects = async () => {
      try {
        listElement.innerHTML = "Loading projects...";
        const files = await getProjectsFromSupabase();
        listElement.innerHTML = "";
        if (files.length === 0) {
          listElement.textContent = "No project files have been uploaded yet.";
        } else {
          files.forEach((file) => {
            const fileItem = document.createElement("div");
            fileItem.className = "project-file-item";
            fileItem.innerHTML = `
              <a href="${file.dataUrl}" download="${file.name}" target="_blank">
                ${file.name} ${file.size ? `(${formatFileSize(file.size)})` : ""
              }
              </a>
            `;
            if (projectWindow.dataset.isAdmin === "true") {
              const deleteBtn = document.createElement("button");
              deleteBtn.textContent = "Delete";
              deleteBtn.className = "project-delete-btn";
              deleteBtn.dataset.filename = file.name;
              deleteBtn.setAttribute("aria-label", `Delete ${file.name}`);
              fileItem.appendChild(deleteBtn);
            }
            listElement.appendChild(fileItem);
          });
        }
      } catch (error) {
        console.error("Error loading projects:", error);
        listElement.innerHTML = "Error loading projects. Please try again.";
      }
    };

    if (!loginBtn.hasAttribute("data-listener-attached")) {
      loginBtn.addEventListener("click", () => {
        const password = prompt("Enter admin password:");
        if (
          password &&
          CryptoJS.SHA256(password).toString() === ADMIN_PASSWORD_HASH
        ) {
          projectWindow.dataset.isAdmin = "true";
          loginBtn.style.display = "none";
          uploadSection.style.display = "block";
          loadProjects();
          alert("Admin mode activated!");
        } else if (password) {
          new Audio("/assets/sounds/Error.mp3").play();
          alert("Incorrect admin password.");
        }
      });
      loginBtn.setAttribute("data-listener-attached", "true");
    }

    if (!listElement.hasAttribute("data-listener-attached")) {
      listElement.addEventListener("click", async (e) => {
        if (e.target.classList.contains("project-delete-btn")) {
          const fileName = e.target.dataset.filename;
          if (
            confirm(
              `Are you sure you want to move "${fileName}" to the Recycle Bin?`
            )
          ) {
            const success = await moveProjectToRecycleBin(fileName);
            if (success) {
              alert(`"${fileName}" moved to Recycle Bin successfully!`);
              loadProjects();
            } else {
              alert("Error moving project to Recycle Bin.");
            }
          }
        }
      });
      listElement.setAttribute("data-listener-attached", "true");
    }

    if (!uploadBtn.hasAttribute("data-listener-attached")) {
      uploadBtn.addEventListener("click", async () => {
        const file = fileInput.files[0];
        if (!file) {
          alert("Please select a file to upload.");
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          alert("File size too large. Maximum size is 10MB.");
          return;
        }

        uploadBtn.disabled = true;
        uploadBtn.textContent = "Uploading...";
        const success = await uploadProjectToSupabase(file);
        if (success) {
          alert(`File "${file.name}" uploaded successfully!`);
          fileInput.value = "";
          loadProjects();
        } else {
          alert("Error uploading file. Please try again.");
        }
        uploadBtn.disabled = false;
        uploadBtn.textContent = "Upload";
      });
      uploadBtn.setAttribute("data-listener-attached", "true");
    }

    loadProjects();
  };

  /**
   * Menginisialisasi fungsionalitas jendela "Recycle Bin".
   * @param {HTMLElement} binWindow - Elemen jendela Recycle Bin.
   */
  const initRecycleBinWindow = (binWindow) => {
    const listElement = binWindow.querySelector(".recycle-bin-list");
    const emptyBinBtn = binWindow.querySelector(".empty-bin-btn");
    const loginBtn = binWindow.querySelector(".admin-login-btn");
    let isAdmin = binWindow.dataset.isAdmin === "true";

    const setAdminView = () => {
      isAdmin = binWindow.dataset.isAdmin === "true";
      if (isAdmin) {
        loginBtn.style.display = "none";
        emptyBinBtn.style.display = "inline-block";
      } else {
        loginBtn.style.display = "inline-block";
        emptyBinBtn.style.display = "none";
      }
    };

    const loadRecycledItems = () => {
      const items = getFromStorage(RECYCLE_BIN_KEY);
      listElement.innerHTML = "";
      if (!items || !Array.isArray(items) || items.length === 0) {
        listElement.textContent = "Recycle Bin is empty.";
        updateRecycleBinIcon();
        return;
      }

      items.forEach((item, index) => {
        const itemEl = document.createElement("div");
        itemEl.className = "recycle-bin-item";
        itemEl.innerHTML = `<span>${item.name}</span>`;

        if (isAdmin) {
          const btnContainer = document.createElement("div");
          const restoreBtn = document.createElement("button");
          restoreBtn.textContent = "Restore";
          restoreBtn.onclick = () => {
            const projects = getFromStorage(PROJECT_FILES_KEY);
            projects.push(item);
            if (saveToStorage(PROJECT_FILES_KEY, projects)) {
              items.splice(index, 1);
              saveToStorage(RECYCLE_BIN_KEY, items);
              refreshDynamicWindows();
            }
          };

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "Delete";
          deleteBtn.onclick = () => {
            if (
              confirm(
                `Are you sure you want to permanently delete ${item.name}?`
              )
            ) {
              items.splice(index, 1);
              if (saveToStorage(RECYCLE_BIN_KEY, items)) {
                refreshDynamicWindows();
              }
            }
          };
          btnContainer.append(restoreBtn, deleteBtn);
          itemEl.appendChild(btnContainer);
        }
        listElement.appendChild(itemEl);
      });
      updateRecycleBinIcon();
    };

    if (!loginBtn.dataset.listenerAttached) {
      loginBtn.addEventListener("click", () => {
        const password = prompt("Enter admin password:");
        if (
          password &&
          CryptoJS.SHA256(password).toString() === ADMIN_PASSWORD_HASH
        ) {
          binWindow.dataset.isAdmin = "true";
          setAdminView();
          loadRecycledItems();
        } else if (password) {
          new Audio("/assets/sounds/Error.mp3").play();
        }
      });
      loginBtn.dataset.listenerAttached = "true";
    }

    if (!emptyBinBtn.dataset.listenerAttached) {
      emptyBinBtn.addEventListener("click", () => {
        if (binWindow.dataset.isAdmin === "true") {
          if (
            confirm(
              "Are you sure you want to empty the Recycle Bin? This cannot be undone."
            )
          ) {
            if (saveToStorage(RECYCLE_BIN_KEY, [])) {
              refreshDynamicWindows();
            }
          }
        } else {
          alert("Admin access required.");
        }
      });
      emptyBinBtn.dataset.listenerAttached = "true";
    }

    setAdminView();
    loadRecycledItems();
  };

  /**
   * Menginisialisasi fungsionalitas jendela "Suggestion".
   * @param {HTMLElement} suggestionWindow - Elemen jendela Suggestion.
   */
  const initSuggestionWindow = (suggestionWindow) => {
    const display = suggestionWindow.querySelector(".suggestion-display");
    const input = suggestionWindow.querySelector(".suggestion-input");
    const saveBtn = suggestionWindow.querySelector(".suggestion-save-btn");
    const statusEl =
      suggestionWindow.querySelector(".suggestion-status") ||
      document.createElement("div");

    if (!suggestionWindow.querySelector(".suggestion-status")) {
      statusEl.className = "suggestion-status";
      statusEl.style.marginTop = "10px";
      statusEl.style.padding = "5px";
      statusEl.style.display = "none";
      suggestionWindow
        .querySelector(".suggestion-content")
        .appendChild(statusEl);
    }

    const showStatus = (message, isError = false) => {
      statusEl.textContent = message;
      statusEl.style.display = "block";
      statusEl.style.backgroundColor = isError ? "#ffebee" : "#e8f5e8";
      statusEl.style.color = isError ? "#c62828" : "#2e7d32";
      statusEl.style.border = `1px solid ${isError ? "#ffcdd2" : "#c8e6c9"}`;
      setTimeout(() => {
        statusEl.style.display = "none";
      }, 3000);
    };

    const loadSuggestions = async () => {
      try {
        display.innerHTML = "Loading suggestions...";
        const suggestions = await getSuggestionsFromSupabase(); // Menggunakan Supabase
        display.innerHTML = "";
        if (suggestions.length === 0) {
          display.textContent = "No suggestions yet. Be the first!";
        } else {
          suggestions.forEach((s) => {
            const entry = document.createElement("div");
            entry.className = "suggestion-entry";
            entry.innerHTML = `<strong>[${new Date(
              s.timestamp
            ).toLocaleString()}]</strong><br>${s.text}`;
            display.appendChild(entry);
          });
        }
        display.scrollTop = display.scrollHeight;
      } catch (error) {
        console.error("Error loading suggestions:", error);
        display.innerHTML = "Error loading suggestions. Please try again.";
      }
    };

    if (!saveBtn.dataset.listenerAttached) {
      saveBtn.addEventListener("click", async () => {
        const newText = input.value.trim();
        if (newText) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
          const success = await saveSuggestionToSupabase(newText);
          if (success) {
            input.value = "";
            showStatus("Suggestion saved! Thank you.");
            new Audio("/assets/sounds/oke.mp3").play();
            await loadSuggestions();
          } else {
            showStatus("Failed to save suggestion. Please try again.", true);
            new Audio("/assets/sounds/Error.mp3").play();
          }
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Suggestion";
        } else {
          showStatus("Please enter a suggestion before saving.", true);
          new Audio("/assets/sounds/Error.mp3").play();
        }
      });
      saveBtn.dataset.listenerAttached = "true";
    }

    loadSuggestions();
  };

  /**
   * Menginisialisasi fungsionalitas jendela "Terminal".
   * @param {HTMLElement} terminalWindow - Elemen jendela Terminal.
   */
  const initTerminal = (terminalWindow) => {
    const output = terminalWindow.querySelector(".terminal-output");
    const input = terminalWindow.querySelector(".terminal-input");
    let commandHistory = [];
    let historyIndex = -1;
    let isExecuting = false;

    const printToTerminal = (text, addNewline = true) => {
      output.textContent += text + (addNewline ? "\n" : "");
      output.scrollTop = output.scrollHeight;
    };

    const typewriterPrint = (text, onComplete) => {
      isExecuting = true;
      input.disabled = true;
      let i = 0;
      const speed = 15;
      const typing = setInterval(() => {
        if (i < text.length) {
          output.textContent += text[i];
          i++;
          output.scrollTop = output.scrollHeight;
        } else {
          clearInterval(typing);
          printToTerminal("", true);
          isExecuting = false;
          input.disabled = false;
          input.focus();
          if (onComplete) onComplete();
        }
      }, speed);
    };

    const executeCommand = (cmd) => {
      const parts = cmd.split(" ");
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");
      printToTerminal(`C:\\>${cmd}`);

      switch (command) {
        case "help":
          printToTerminal(
            "Available commands:\n" +
            "  help          - Show this help message\n" +
            "  echo [text]   - Print text to terminal\n" +
            "  echo art      - Display some ASCII art\n" +
            "  date          - Show current date and time\n" +
            "  clear         - Clear the terminal screen\n" +
            '  about         - Open the "About Me" window\n' +
            '  projects      - Open the "Projects" window\n' +
            '  contact       - Open the "Contact" window'
          );
          break;
        case "echo":
          if (args.toLowerCase() === "art") {
            const asciiArt = ` ▄▄▄       ██▀███   ██▀███  
▒████▄    ▓██ ▒ ██▒▓██ ▒ ██▒
▒██  ▀█▄  ▓██ ░▄█ ▒▓██ ░▄█ ▒
░██▄▄▄▄██ ▒██▀▀█▄  ▒██▀▀█▄  
 ▓█   ▓██▒░██▓ ▒██▒░██▓ ▒██▒
 ▒▒   ▓▒█░░ ▒▓ ░▒▓░░ ▒▓ ░▒▓░
    ▒   ▒▒ ░  ░▒ ░ ▒░  ░▒ ░ ▒░
    ░   ▒     ░░   ░   ░░   ░ 
            ░  ░   ░        ░     
                                                        `.trimStart();
            typewriterPrint(asciiArt);
          } else {
            printToTerminal(args);
          }
          break;
        case "date":
          printToTerminal(new Date().toLocaleString());
          break;
        case "clear":
          output.textContent = "";
          break;
        case "about":
          openWindow("about-window");
          printToTerminal('Opening "About Me"...');
          break;
        case "projects":
          openWindow("projects-window");
          printToTerminal('Opening "Projects"...');
          break;
        case "contact":
          openWindow("contact-window");
          printToTerminal('Opening "Contact"...');
          break;
        default:
          printToTerminal(
            `'${command}' is not recognized as an internal or external command.`
          );
      }
    };

    printToTerminal(
      'Terminal demoPortoV1 [Ver, 1.0]\nAll rights reserved.\nType "help" for a list of commands.'
    );
    input.addEventListener("keydown", (e) => {
      if (isExecuting) return;
      if (e.key === "Enter") {
        e.preventDefault();
        const command = input.value.trim();
        if (command) {
          commandHistory.push(command);
          historyIndex = commandHistory.length;
          executeCommand(command);
          input.value = "";
        }
      }
    });

    terminalWindow
      .querySelector(".terminal-content")
      .addEventListener("click", () => {
        if (!isExecuting) {
          input.focus();
        }
      });
  };

  /**
   * Menginisialisasi fungsionalitas game "Snake".
   * @param {HTMLElement} gameWindow - Elemen jendela game Snake.
   */
  let snakeHighScore = 0;
  const initSnakeGame = (gameWindow) => {
    const canvas = gameWindow.querySelector("#snake-canvas");
    const ctx = canvas.getContext("2d");
    const scoreEl = gameWindow.querySelector(".snake-score");
    const highScoreEl = gameWindow.querySelector(".snake-high-score");
    const controlButtons = gameWindow.querySelectorAll(".snake-control-btn");
    const windowId = gameWindow.id;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    let gridSize = 20;
    let tileCount = canvas.width / gridSize;
    let snake, food, dx, dy, score;

    const setDirection = (newDx, newDy) => {
      if (dx === -newDx && newDx !== 0) return;
      if (dy === -newDy && newDy !== 0) return;
      dx = newDx;
      dy = newDy;
    };
    openWindows[windowId].setDirection = setDirection;

    const resetGame = () => {
      if (openWindows[windowId] && openWindows[windowId].interval) {
        clearInterval(openWindows[windowId].interval);
      }
      snake = [{ x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) }];
      food = {};
      placeFood();
      dx = 0;
      dy = 0;
      score = 0;
      scoreEl.textContent = 0;
      highScoreEl.textContent = snakeHighScore;
      const gameLoop = setInterval(mainLoop, 100);
      openWindows[windowId].interval = gameLoop;
    };

    const placeFood = () => {
      food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
      };
      for (let part of snake) {
        if (part.x === food.x && part.y === food.y) {
          placeFood();
          break;
        }
      }
    };

    const mainLoop = () => {
      let head = { x: snake[0].x + dx, y: snake[0].y + dy };

      if (
        head.x < 0 ||
        head.x >= tileCount ||
        head.y < 0 ||
        head.y >= tileCount
      ) {
        return resetGame();
      }

      for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
          return resetGame();
        }
      }

      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        if (score > snakeHighScore) {
          snakeHighScore = score;
          highScoreEl.textContent = snakeHighScore;
        }
        placeFood();
      } else {
        snake.pop();
      }

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "lime";
      snake.forEach((part) =>
        ctx.fillRect(
          part.x * gridSize,
          part.y * gridSize,
          gridSize - 2,
          gridSize - 2
        )
      );
      ctx.fillStyle = "red";
      ctx.fillRect(
        food.x * gridSize,
        food.y * gridSize,
        gridSize - 2,
        gridSize - 2
      );
    };

    controlButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const direction = button.dataset.direction;
        switch (direction) {
          case "up":
            setDirection(0, -1);
            break;
          case "down":
            setDirection(0, 1);
            break;
          case "left":
            setDirection(-1, 0);
            break;
          case "right":
            setDirection(1, 0);
            break;
        }
      });
    });

    resetGame();
  };

  /**
   * Menginisialisasi fungsionalitas game "2048".
   * @param {HTMLElement} gameWindow - Elemen jendela game 2048.
   */
  const init2048Game = (gameWindow) => {
    const gridDisplay = gameWindow.querySelector("#game-2048-grid");
    const scoreDisplay = gameWindow.querySelector(".game-2048-score");
    const resetButton = gameWindow.querySelector(".game-2048-reset");
    const controlsContainer = gameWindow.querySelector(".game-2048-controls");
    const windowId = gameWindow.id;

    const size = 4;
    let board = [];
    let score = 0;

    if (isMobile() && controlsContainer) {
      controlsContainer.style.display = "flex";
    }

    function createBoard() {
      board = Array(size * size).fill(0);
      score = 0;
      addNumber();
      addNumber();
      drawBoard();
    }

    function drawBoard() {
      gridDisplay.innerHTML = "";
      scoreDisplay.textContent = score;
      for (let i = 0; i < size * size; i++) {
        const tile = document.createElement("div");
        tile.className = "game-2048-tile";
        const value = board[i];
        if (value > 0) {
          tile.textContent = value;
          tile.setAttribute("data-value", value);
        }
        gridDisplay.appendChild(tile);
      }
    }

    function addNumber() {
      let emptyTiles = [];
      board.forEach((val, index) => {
        if (val === 0) emptyTiles.push(index);
      });
      if (emptyTiles.length > 0) {
        const randomIndex =
          emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        board[randomIndex] = Math.random() > 0.9 ? 4 : 2;
      }
    }

    function move(direction) {
      let moved = false;
      let tempBoard = [...board];
      let scoreGained = 0;

      const getLine = (i) =>
        direction === "left" || direction === "right"
          ? tempBoard.slice(i * size, i * size + size)
          : Array.from({ length: size }, (_, j) => tempBoard[j * size + i]);

      const setLine = (i, line) => {
        if (direction === "left" || direction === "right") {
          line.forEach((val, c) => (tempBoard[i * size + c] = val));
        } else {
          line.forEach((val, r) => (tempBoard[r * size + i] = val));
        }
      };

      const transform = (line) => {
        let filtered = line.filter((num) => num > 0);
        let newLine = [];
        for (let i = 0; i < filtered.length; i++) {
          if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
            const newValue = filtered[i] * 2;
            newLine.push(newValue);
            scoreGained += newValue;
            i++;
          } else {
            newLine.push(filtered[i]);
          }
        }
        while (newLine.length < size) {
          newLine.push(0);
        }
        return newLine;
      };

      for (let i = 0; i < size; i++) {
        let line = getLine(i);
        if (direction === "right" || direction === "down") line.reverse();
        let newLine = transform(line);
        if (direction === "right" || direction === "down") newLine.reverse();
        setLine(i, newLine);
      }

      if (JSON.stringify(board) !== JSON.stringify(tempBoard)) {
        moved = true;
        board = [...tempBoard];
        score += scoreGained;
        addNumber();
        drawBoard();
      }
    }

    openWindows[windowId].move = move;

    if (isMobile() && controlsContainer) {
      const controlButtons = controlsContainer.querySelectorAll(
        ".game-2048-control-btn"
      );
      controlButtons.forEach((button) => {
        button.addEventListener("click", () => move(button.dataset.direction));
      });
    }

    let touchStartX = 0,
      touchStartY = 0,
      touchEndX = 0,
      touchEndY = 0;

    gridDisplay.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      },
      { passive: true }
    );

    gridDisplay.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    });

    function handleSwipe() {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const minSwipeDistance = 50;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > minSwipeDistance) {
          if (deltaX > 0) {
            move("right");
          } else {
            move("left");
          }
        }
      } else {
        if (Math.abs(deltaY) > minSwipeDistance) {
          if (deltaY > 0) {
            move("down");
          } else {
            move("up");
          }
        }
      }
    }

    resetButton.addEventListener("click", createBoard);
    createBoard();
  };

  /**
   * Menginisialisasi semua event listener global (keyboard, klik ikon, dll.).
   */
  const initEventListeners = () => {
    document.addEventListener("keydown", (e) => {
      if (!activeWindowId || !openWindows[activeWindowId]) return;
      const activeWinData = openWindows[activeWindowId];
      const gameHandlers = {
        "snake-window": {
          ArrowUp: () => activeWinData.setDirection(0, -1),
          ArrowDown: () => activeWinData.setDirection(0, 1),
          ArrowLeft: () => activeWinData.setDirection(-1, 0),
          ArrowRight: () => activeWinData.setDirection(1, 0),
        },
        "2048-window": {
          ArrowUp: () => activeWinData.move("up"),
          ArrowDown: () => activeWinData.move("down"),
          ArrowLeft: () => activeWinData.move("left"),
          ArrowRight: () => activeWinData.move("right"),
        },
      };
      if (
        gameHandlers[activeWinData.templateId] &&
        gameHandlers[activeWinData.templateId][e.key]
      ) {
        e.preventDefault();
        gameHandlers[activeWinData.templateId][e.key]();
      }
    });

    startButton.addEventListener("click", (e) => {
      e.stopPropagation();
      startMenu.style.display =
        startMenu.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", (e) => {
      if (!startMenu.contains(e.target) && e.target !== startButton) {
        startMenu.style.display = "none";
      }
    });

    startMenuItems.forEach((item) => {
      item.addEventListener("click", () => {
        const templateId = item.getAttribute("data-window-template");
        if (templateId) openWindow(templateId);
        startMenu.style.display = "none";
      });
    });

    desktop.addEventListener(isMobile() ? "click" : "dblclick", (e) => {
      const icon = e.target.closest(".icon");
      if (icon) {
        const templateId = icon.getAttribute("data-window-template");
        if (templateId) openWindow(templateId);
      }
    });

    adminControl.addEventListener("click", async () => {
      const password = prompt("Enter admin password:");
      if (
        password &&
        CryptoJS.SHA256(password).toString() === ADMIN_PASSWORD_HASH
      ) {
        const action = prompt(
          "Clear data: 'suggestions', 'projects', or 'bin'."
        ).toLowerCase();
        const actions = {
          suggestions: { key: SUGGESTIONS_KEY, msg: "ALL suggestions" },
          projects: { key: PROJECT_FILES_KEY, msg: "ALL project files" },
          bin: { key: RECYCLE_BIN_KEY, msg: "the Recycle Bin" },
        };

        if (action && actions[action]) {
          if (action === "suggestions") {
            if (
              confirm(`Are you sure you want to delete ${actions[action].msg}?`)
            ) {
              const success = await clearSuggestionsFromSupabase();
              if (success) {
                alert("All suggestions have been cleared from the database.");
                refreshDynamicWindows();
              } else {
                alert("Failed to clear suggestions. Please try again.");
              }
            }
          } else if (action === "projects" || action === "bin") {
            if (
              confirm(`Are you sure you want to delete ${actions[action].msg}?`)
            ) {
              if (saveToStorage(actions[action].key, [])) {
                alert("Data cleared.");
                refreshDynamicWindows();
              } else {
                alert("Failed to clear data.");
              }
            }
          }
        } else if (action) {
          new Audio("/assets/sounds/Error.mp3").play();
          alert("Invalid option.");
        }
      } else if (password) {
        new Audio("/assets/sounds/Error.mp3").play();
      }
    });
  };

  /**
   * Menguji koneksi ke Supabase.
   */
  const testConnection = async () => {
    try {
      const { data, error } = await supabase
        .from("suggestions")
        .select("count");
      if (error) {
        console.error("Koneksi gagal:", error);
        alert("Error connecting to Supabase. Check console for details.");
      } else {
        console.log("Koneksi berhasil! Jumlah data:", data);
      }
    } catch (error) {
      console.error("Test connection error:", error);
    }
  };

  /**
   * Fungsi utama untuk memulai aplikasi.
   */
  const initApp = () => {
    initCaptcha();
    initClock();
    initEventListeners();
    updateRecycleBinIcon();
    testConnection();
  };
});
