from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from utils.db import get_db
from models.bundle_model import Bundle
from schemas.bundle_schema import BundleCreate, BundleResponse
from typing import List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bundles", tags=["Bundles"])

@router.get("/", response_model=List[BundleResponse])
def get_bundles(db: Session = Depends(get_db)):
    try:
        logger.info("Fetching all bundles")
        bundles = db.query(Bundle).all()
        logger.info(f"Found {len(bundles)} bundles")
        return bundles
    except Exception as e:
        logger.error(f"Error fetching bundles: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{bundle_id}", response_model=BundleResponse)
def get_bundle(bundle_id: int, db: Session = Depends(get_db)):
    try:
        bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle not found")
        return bundle
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bundle {bundle_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/", response_model=BundleResponse)
def create_bundle(bundle: BundleCreate, db: Session = Depends(get_db)):
    try:
        # Check if bundle with same name exists
        existing_bundle = db.query(Bundle).filter(Bundle.name == bundle.name).first()
        if existing_bundle:
            raise HTTPException(status_code=400, detail="Bundle with this name already exists")
        
        new_bundle = Bundle(**bundle.dict())
        db.add(new_bundle)
        db.commit()
        db.refresh(new_bundle)
        return new_bundle
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating bundle: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.put("/{bundle_id}", response_model=BundleResponse)
def update_bundle(bundle_id: int, bundle: BundleCreate, db: Session = Depends(get_db)):
    try:
        db_bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
        if not db_bundle:
            raise HTTPException(status_code=404, detail="Bundle not found")
        
        # Check if another bundle has the same name
        existing_bundle = db.query(Bundle).filter(Bundle.name == bundle.name, Bundle.id != bundle_id).first()
        if existing_bundle:
            raise HTTPException(status_code=400, detail="Another bundle with this name already exists")
        
        for key, value in bundle.dict().items():
            setattr(db_bundle, key, value)
        
        db.commit()
        db.refresh(db_bundle)
        return db_bundle
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating bundle {bundle_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/{bundle_id}")
def delete_bundle(bundle_id: int, db: Session = Depends(get_db)):
    try:
        bundle = db.query(Bundle).filter(Bundle.id == bundle_id).first()
        if not bundle:
            raise HTTPException(status_code=404, detail="Bundle not found")
        
        db.delete(bundle)
        db.commit()
        return {"message": "Bundle deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting bundle {bundle_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")