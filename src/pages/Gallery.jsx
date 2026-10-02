import { useEffect, useState } from "react"
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } from "firebase/firestore"
import { db } from "../firebase"
import { Image as ImageIcon, Plus, Trash2, Camera, Filter } from "lucide-react"
import { useAuth } from "../context/AuthContext"

function Gallery() {
  const { userRole } = useAuth()
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState([])
  const [activeCategory, setActiveCategory] = useState("All")
  
  // Addition states
  const [showAddForm, setShowAddForm] = useState(false)
  const [photoUrl, setPhotoUrl] = useState("")
  const [category, setCategory] = useState("Gym Interior")
  const [caption, setCaption] = useState("")

  const categories = ["All", "Gym Interior", "Equipment", "Transformation", "Events"]
  const formCategories = ["Gym Interior", "Equipment", "Transformation", "Events"]

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "gallery"),
      (snapshot) => {
        const photosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        // Sort by creation date
        photosData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setPhotos(photosData)
        setLoading(false)
      },
      (error) => {
        console.error("Error loading gallery: ", error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const handleAddPhoto = async (e) => {
    e.preventDefault()
    if (!photoUrl) return

    try {
      await addDoc(collection(db, "gallery"), {
        url: photoUrl,
        category,
        caption,
        createdAt: new Date().toISOString(),
      })
      setPhotoUrl("")
      setCaption("")
      setShowAddForm(false)
      alert("Photo added successfully!")
    } catch (error) {
      console.error("Error adding photo: ", error)
      alert("Failed to save photo. Please try again.")
    }
  }

  const handleLocalImageUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64Str = reader.result
      try {
        await addDoc(collection(db, "gallery"), {
          url: base64Str,
          category,
          caption: caption || file.name.split(".")[0],
          createdAt: new Date().toISOString(),
        })
        setCaption("")
        setShowAddForm(false)
        alert("Image uploaded and saved successfully!")
      } catch (error) {
        console.error("Error saving uploaded image: ", error)
        alert("Failed to save image.")
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDeletePhoto = async (id) => {
    if (window.confirm("Are you sure you want to delete this photo from the gallery?")) {
      try {
        await deleteDoc(doc(db, "gallery", id))
      } catch (error) {
        console.error("Error deleting photo: ", error)
      }
    }
  }

  const filteredPhotos = activeCategory === "All"
    ? photos
    : photos.filter(p => p.category === activeCategory)

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-900 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl flex items-center gap-3">
            <ImageIcon className="text-red-650" size={38} />
            Gym <span className="text-red-655 text-red-600">Gallery</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm md:text-base">
            Upload and view gym interiors, equipment, transformations, and events pictures.
          </p>
        </div>

        {(userRole === "owner" || userRole === "trainer") && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-red-600 hover:bg-red-700 transition-all rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide flex items-center gap-2 cursor-pointer text-white shadow-lg shadow-red-950/20"
          >
            <Plus size={16} /> {showAddForm ? "Hide Form" : "Add Gym Photo"}
          </button>
        )}
      </div>

      {/* Upload/Add Form */}
      {showAddForm && (
        <div className="bg-[#111111] p-6 rounded-3xl border border-gray-800 mb-8 max-w-2xl shadow-xl animate-in fade-in slide-in-from-top-4 duration-200">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Camera size={16} className="text-red-500" /> Upload or Add Image Link
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Image Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-650 text-xs text-white cursor-pointer"
              >
                {formCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Caption / Title</label>
              <input
                type="text"
                placeholder="e.g. New Leg Press Machine"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-650 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            {/* Link Input */}
            <form onSubmit={handleAddPhoto} className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Option A: Image URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste direct image link..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="flex-1 bg-black border border-gray-800 rounded-xl p-3 outline-none focus:border-red-650 text-xs text-white"
                />
                <button 
                  type="submit" 
                  disabled={!photoUrl}
                  className="bg-red-600 hover:bg-red-750 disabled:bg-red-800 text-xs font-bold px-4 rounded-xl cursor-pointer text-white"
                >
                  Save
                </button>
              </div>
            </form>

            {/* File Upload */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Option B: Upload File</label>
              <label className="bg-black border border-dashed border-gray-800 hover:border-red-900/50 rounded-xl p-3 flex justify-center items-center gap-2 text-xs text-gray-500 hover:text-gray-300 cursor-pointer transition-all h-[46px]">
                <Camera size={16} />
                <span>Choose Image File...</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLocalImageUpload}
                  className="hidden" 
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer border ${
              activeCategory === cat
                ? "bg-red-600 border-red-650 text-white shadow-md shadow-red-950/20"
                : "bg-[#111111] border-gray-900 text-gray-400 hover:bg-[#1a1a1a] hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Photos Grid */}
      {loading ? (
        <div className="min-h-[200px] flex flex-col justify-center items-center gap-2">
          <div className="w-8 h-8 border-4 border-red-650 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-xs italic">Loading photostream...</p>
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="bg-[#111111] border border-gray-800 rounded-3xl p-12 text-center flex flex-col items-center gap-2">
          <ImageIcon className="text-gray-700" size={44} />
          <h3 className="text-lg font-bold text-gray-400">No Photos Found</h3>
          <p className="text-gray-500 text-xs">There are no uploaded pictures under category: {activeCategory}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPhotos.map((photo) => (
            <div 
              key={photo.id}
              className="bg-[#111111] border border-gray-900 rounded-3xl overflow-hidden shadow-lg hover:border-red-600/30 transition-all duration-300 group flex flex-col justify-between"
            >
              <div className="relative overflow-hidden aspect-video">
                <img 
                  src={photo.url} 
                  alt={photo.caption || "Gym Image"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500" }}
                />
                <span className="absolute top-3 left-3 bg-red-950/80 border border-red-900 text-red-500 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                  {photo.category}
                </span>
                
                {(userRole === "owner" || userRole === "trainer") && (
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="absolute top-3 right-3 bg-black/60 hover:bg-red-700/80 text-gray-400 hover:text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer shadow-md"
                    title="Delete Photo"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {photo.caption && (
                <div className="p-4 border-t border-gray-900/60 bg-[#121212]">
                  <strong className="text-xs text-white font-semibold block truncate">{photo.caption}</strong>
                  <span className="text-[9px] text-gray-500 font-semibold block mt-1">{new Date(photo.createdAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default Gallery
